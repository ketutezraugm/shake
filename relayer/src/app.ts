import { createHash } from "node:crypto";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { answerQuestion, quota, type Chat } from "./assistant.js";
import { createAuthenticator } from "./auth.js";
import { HttpError } from "./errors.js";
import type { ChainDeal, NearReader } from "./near.js";
import { rateLimit } from "./rateLimit.js";
import type { Store } from "./store.js";
import type { JwtVerifier } from "./supabaseAuth.js";
import type { ClaimRes, HistoryItem, Inbox, Listing, ListingPage, ReceiptKind, SellerListing, Shop } from "./types.js";
import {
  MAX_PHOTOS,
  MAX_SLOTS,
  parseAnswer,
  parseAsk,
  parseAssistantAsk,
  parseCategory,
  parseCreateListing,
  parseMessage,
  parseReceipt,
  parsePhotoReq,
  parseSlots,
  parseUpdateProfile,
} from "./validate.js";

export type Deps = {
  store: Store;
  near: NearReader;
  allowedOrigin: string;
  /** Checks a Google or email login; absent, the two routes open to a login answer 401 to it. */
  verifyJwt?: JwtVerifier;
  /** Absent when there is no NEAR AI key; POST /assistant then answers 503. */
  chat?: Chat;
  now?: () => number;
};

const PAGE_SIZE = 20;
const REQUESTS_PER_MINUTE = 120;
const HOUR_MS = 60 * 60 * 1000;
const ASSISTANT_PER_ACCOUNT_PER_HOUR = 20;
// Protects the $10 NEAR AI credit; a restart resets it.
const ASSISTANT_PER_DAY = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HOLDING_STATES = new Set(["Matched", "Funded"]);
// Chat and the inbox's matches open once a deal has matched; a NoDeal that kept `matched_at_ns` is an expired match.
const MATCHED_STATES = new Set(["Matched", "Funded", "Released", "Refunded"]);
// What each receipt proves: the contract method that moved the money, and the deal states that can only follow it.
const RECEIPT_PROOF: Record<ReceiptKind, { method: string; states: string[] }> = {
  deposit: { method: "deposit", states: ["Funded", "Released", "Refunded"] },
  release: { method: "confirm_received", states: ["Released"] },
};

export function createApp({ store, near, allowedOrigin, verifyJwt, chat, now = Date.now }: Deps) {
  const app = new Hono();
  const authenticate = createAuthenticator(near, now);
  const accountQuota = quota(ASSISTANT_PER_ACCOUNT_PER_HOUR, HOUR_MS, now);
  const dailyQuota = quota(ASSISTANT_PER_DAY, 24 * HOUR_MS, now);

  app.use(
    cors({
      origin: allowedOrigin,
      allowHeaders: ["content-type", "x-account-id", "x-public-key", "x-timestamp", "x-signature", "authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  app.use(rateLimit(REQUESTS_PER_MINUTE, now));

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  function parseBody(raw: string): unknown {
    if (raw === "") return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new HttpError(400, "body must be JSON");
    }
  }

  /** Reads the body once, verifies the signature over it, and returns the caller with the parsed JSON. */
  async function signed(c: Context): Promise<{ account: string; body: unknown }> {
    const raw = await c.req.text();
    const account = await authenticate({ method: c.req.method, path: c.req.path, body: raw, header: (name) => c.req.header(name) });
    return { account, body: parseBody(raw) };
  }

  /** `signed`, or a Google or email login as a bearer token: a login has no NEAR account, so it is named `supabase:<user id>`. */
  async function signedOrLoggedIn(c: Context): Promise<{ account: string; body: unknown }> {
    const token = c.req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return signed(c);
    const userId = verifyJwt ? await verifyJwt(token) : null;
    if (!userId) throw new HttpError(401, "sign in first");
    return { account: `supabase:${userId}`, body: parseBody(await c.req.text()) };
  }

  async function findListing(id: string): Promise<Listing> {
    const listing = UUID.test(id) ? await store.get(id) : null;
    if (!listing) throw new HttpError(404, "listing not found");
    return listing;
  }

  async function ownListing(id: string, account: string): Promise<Listing> {
    const listing = await findListing(id);
    if (listing.sellerAccount !== account) throw new HttpError(403, "only the seller can do this");
    return listing;
  }

  // A buyer who raises first moves a Retry deal to Waiting, so the seller still owes the round while their sealed limits lag the round number.
  const sellerOwesRound = (deal: ChainDeal) =>
    deal.seller_cts ? (deal.state === "Retry" || deal.state === "Waiting") && deal.seller_cts.length < deal.round : deal.state === "Retry";

  const isMatched = (deal: ChainDeal) => MATCHED_STATES.has(deal.state) || (deal.state === "NoDeal" && deal.matched_at_ns != null);

  async function dealParty(dealId: string, account: string): Promise<ChainDeal> {
    const id = Number(dealId);
    const deal = Number.isSafeInteger(id) && id >= 0 ? await near.getDeal(id) : null;
    if (!deal) throw new HttpError(404, "deal not found");
    if (deal.seller !== account && deal.buyer !== account) throw new HttpError(403, "only the deal's seller or buyer can do this");
    return deal;
  }

  /** The deal's seller or buyer, and only once it has matched: chat is for people who struck a deal. */
  async function chatParty(dealId: string, account: string): Promise<number> {
    const deal = await dealParty(dealId, account);
    if (!isMatched(deal)) throw new HttpError(409, "chat opens after a deal");
    return deal.id;
  }

  const afterId = (value: string | undefined) => {
    const after = value === undefined ? 0 : Number(value);
    if (!Number.isSafeInteger(after) || after < 0) throw new HttpError(400, "bad after");
    return after;
  };

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/listings", async (c) => {
    const category = c.req.query("category");
    const before = c.req.query("cursor");
    if (before !== undefined && Number.isNaN(Date.parse(before))) throw new HttpError(400, "bad cursor");
    const listings = await store.list({
      q: c.req.query("q"),
      category: category === undefined ? undefined : parseCategory(category),
      before,
      limit: PAGE_SIZE,
    });
    const page: ListingPage = { listings, nextCursor: listings.length === PAGE_SIZE ? (listings.at(-1)?.createdAt ?? null) : null };
    return c.json(page);
  });

  app.get("/listings/:id", async (c) => c.json(await findListing(c.req.param("id"))));

  app.post("/listings", async (c) => {
    const { account, body } = await signed(c);
    return c.json(await store.create(account, parseCreateListing(body)), 201);
  });

  app.post("/listings/:id/photos", async (c) => {
    const { account, body } = await signed(c);
    const listing = await ownListing(c.req.param("id"), account);
    const { contentType } = parsePhotoReq(body);
    if (listing.photoUrls.length >= MAX_PHOTOS) throw new HttpError(409, `at most ${MAX_PHOTOS} photos`);
    return c.json(await store.addPhoto(listing.id, contentType), 201);
  });

  app.post("/listings/:id/slots", async (c) => {
    const { account, body } = await signed(c);
    const listing = await ownListing(c.req.param("id"), account);
    if (listing.status !== "open") throw new HttpError(409, "listing is not open");
    const { slots } = parseSlots(body);
    if ((await store.slotsOf(listing.id)).length + slots.length > MAX_SLOTS) {
      throw new HttpError(409, `a listing holds at most ${MAX_SLOTS} slots`);
    }

    // The chain is the authority: each slot must be this seller's untouched deal and the token must open it.
    await Promise.all(
      slots.map(async ({ dealId, linkToken }) => {
        const deal = await near.getDeal(dealId);
        if (!deal || deal.seller !== account) throw new HttpError(400, `deal ${dealId} is not yours`);
        if (deal.state !== "Waiting" || deal.buyer !== null) {
          throw new HttpError(400, `deal ${dealId} must be waiting for its buyer: submit the seller's limit first`);
        }
        if (deal.max_rounds !== listing.maxRounds) throw new HttpError(400, `deal ${dealId} has a different round count`);
        const hash = createHash("sha256").update(linkToken).digest();
        if (!hash.equals(Buffer.from(deal.link_hash))) throw new HttpError(400, `wrong link token for deal ${dealId}`);
      }),
    );
    await store.addSlots(listing.id, slots);
    return c.json({ registered: slots.length }, 201);
  });

  app.post("/listings/:id/claim", async (c) => {
    const { account } = await signed(c);
    const listing = await findListing(c.req.param("id"));
    if (listing.status !== "open") throw new HttpError(409, "listing is not open");
    if (listing.sellerAccount === account) throw new HttpError(403, "sellers cannot buy their own listing");
    // A deal the seller cancelled before any buyer offered is NoDeal with no buyer: it cannot take an offer, so retire it and try the next.
    for (let tries = 0; tries < MAX_SLOTS; tries++) {
      const slot: ClaimRes | null = await store.claim(listing.id, account);
      if (!slot) break;
      const deal = await near.getDeal(slot.dealId).catch(() => null); // an unreadable chain must not stop a claim; the contract still checks the offer
      if (!(deal?.state === "NoDeal" && deal.buyer === null)) return c.json(slot);
      await store.retireSlot(slot.dealId);
    }
    throw new HttpError(409, "no free slot: the seller is negotiating with other buyers");
  });

  app.post("/listings/:id/close", async (c) => {
    const { account } = await signed(c);
    const listing = await ownListing(c.req.param("id"), account);
    if (listing.status !== "open") throw new HttpError(409, "listing is not open");
    await store.setStatus(listing.id, "closed");
    return c.json({ ...listing, status: "closed" });
  });

  // Undoes a publish that failed part way; once a buyer holds a slot the listing can only be closed.
  app.delete("/listings/:id", async (c) => {
    const { account } = await signed(c);
    const listing = await ownListing(c.req.param("id"), account);
    if ((await store.slotsOf(listing.id)).some((slot) => slot.buyerAccount !== null)) {
      throw new HttpError(409, "a buyer holds a slot: close the listing instead");
    }
    await store.remove(listing.id);
    return c.json({ deleted: listing.id });
  });

  // One item, one sale: the first matched deal reserves the listing, a release sells it, and an expired or refunded reservation reopens it.
  app.post("/listings/:id/sync", async (c) => {
    const listing = await findListing(c.req.param("id"));
    if (listing.status === "sold" || listing.status === "closed") return c.json(listing);
    const deals = (await Promise.all((await store.slotsOf(listing.id)).map((slot) => near.getDeal(slot.dealId)))).filter((deal) => deal !== null);

    const released = deals.find((deal) => deal.state === "Released");
    if (released) {
      await store.setStatus(listing.id, "sold");
      return c.json({ ...listing, status: "sold", reservedDealId: null });
    }
    if (listing.status === "open") {
      const holding = deals.find((deal) => HOLDING_STATES.has(deal.state));
      if (!holding) return c.json(listing);
      await store.setStatus(listing.id, "reserved", holding.id);
      return c.json({ ...listing, status: "reserved", reservedDealId: holding.id });
    }
    const reservedId = await store.reservedDealOf(listing.id);
    const reserving = deals.find((deal) => deal.id === reservedId);
    const ended = !reserving || reserving.state === "Refunded" || (reserving.state === "NoDeal" && reserving.matched_at_ns != null);
    if (!ended) return c.json(listing);
    await store.setStatus(listing.id, "open");
    return c.json({ ...listing, status: "open", reservedDealId: null });
  });

  app.get("/profiles/:handle", async (c) => {
    const profile = await store.profileByHandle(c.req.param("handle"));
    if (!profile) throw new HttpError(404, "profile not found");
    const { accountId, ...publicFields } = profile;
    const all = await store.listBySeller(accountId);
    const shop: Shop = {
      profile: publicFields,
      listings: all.filter((l) => l.status === "open" || l.status === "reserved"),
      soldCount: all.filter((l) => l.status === "sold").length,
    };
    return c.json(shop);
  });

  app.get("/me/profile", async (c) => {
    const { account } = await signed(c);
    const profile = await store.profileOf(account);
    if (!profile) throw new HttpError(404, "no shop for this account yet");
    return c.json(profile);
  });

  app.put("/me/profile", async (c) => {
    const { account, body } = await signed(c);
    const { handle, ...fields } = parseUpdateProfile(body);
    if (await store.profileOf(account)) return c.json(await store.saveProfile(account, fields));
    if (!handle) throw new HttpError(400, "handle is required to create a profile");
    return c.json(await store.saveProfile(account, fields, { handle }));
  });

  app.get("/listings/:id/questions", async (c) => c.json(await store.answeredQuestions((await findListing(c.req.param("id"))).id)));

  app.post("/listings/:id/questions", async (c) => {
    const { account, body } = await signedOrLoggedIn(c);
    const listing = await findListing(c.req.param("id"));
    if (listing.sellerAccount === account) throw new HttpError(403, "sellers cannot ask on their own listing");
    return c.json(await store.addQuestion(listing.id, account, parseAsk(body).question), 201);
  });

  app.post("/assistant", async (c) => {
    const { account, body } = await signedOrLoggedIn(c);
    if (!chat) throw new HttpError(503, "assistant is not configured");
    const { listingId, question } = parseAssistantAsk(body);
    const listing = await findListing(listingId);
    if (!accountQuota(account) || !dailyQuota("all")) throw new HttpError(429, "assistant limit reached, ask the seller instead");
    return c.json(await answerQuestion(chat, listing, await store.answeredQuestions(listing.id), question));
  });

  app.post("/questions/:id/answer", async (c) => {
    const { account, body } = await signed(c);
    const id = Number(c.req.param("id"));
    const question = Number.isSafeInteger(id) ? await store.question(id) : null;
    if (!question) throw new HttpError(404, "question not found");
    await ownListing(question.listingId, account);
    const answered = await store.answerQuestion(id, parseAnswer(body).answer);
    if (!answered) throw new HttpError(409, "question already answered");
    return c.json(answered);
  });

  app.get("/deals/:dealId/messages", async (c) => {
    const { account } = await signed(c);
    const dealId = await chatParty(c.req.param("dealId"), account);
    return c.json(await store.messagesOf(dealId, afterId(c.req.query("after"))));
  });

  app.post("/deals/:dealId/messages", async (c) => {
    const { account, body } = await signed(c);
    const dealId = await chatParty(c.req.param("dealId"), account);
    return c.json(await store.addMessage(dealId, account, parseMessage(body).body), 201);
  });

  // The caller names the transaction; the relayer believes only what the chain says about it.
  app.post("/deals/:dealId/receipts", async (c) => {
    const { account, body } = await signed(c);
    const deal = await dealParty(c.req.param("dealId"), account);
    const { kind, txHash } = parseReceipt(body);
    const proof = RECEIPT_PROOF[kind];
    if (!proof.states.includes(deal.state) || !deal.price) throw new HttpError(409, `the deal has no ${kind} yet`);

    const tx = await near.getTx(txHash, account);
    const matches = tx?.success && tx.methodName === proof.method && tx.dealId === deal.id && (kind !== "deposit" || tx.depositYocto === deal.price);
    if (!matches) throw new HttpError(422, `that transaction is not this deal's ${kind}`);

    const receipt = await store.addReceipt({ dealId: deal.id, kind, txHash, signerAccount: account, amountYocto: deal.price, recordedAt: new Date(now()).toISOString() });
    return c.json(receipt, 201);
  });

  app.get("/me/history", async (c) => {
    const { account } = await signed(c);
    const items: Omit<HistoryItem, "receipts">[] = [];
    const note = async (deal: ChainDeal, listingId: string, title: string, role: "seller" | "buyer") => {
      if (!isMatched(deal)) return;
      const photoUrl = (await store.get(listingId))?.photoUrls[0] ?? null;
      items.push({ listingId, title, photoUrl, role, dealId: deal.id, counterparty: (role === "seller" ? deal.buyer : deal.seller) ?? "", state: deal.state, priceYocto: deal.price ?? null });
    };

    for (const listing of await store.listBySeller(account)) {
      for (const slot of (await store.slotsOf(listing.id)).filter((s) => s.buyerAccount !== null)) {
        const deal = await near.getDeal(slot.dealId);
        if (deal) await note(deal, listing.id, listing.title, "seller");
      }
    }
    for (const negotiation of await store.negotiationsOf(account)) {
      const deal = await near.getDeal(negotiation.dealId);
      if (deal) await note(deal, negotiation.listingId, negotiation.title, "buyer");
    }
    const receipts = await store.receiptsOf(items.map((item) => item.dealId));
    const history: HistoryItem[] = items.map((item) => ({ ...item, receipts: receipts.filter((r) => r.dealId === item.dealId) }));
    return c.json(history);
  });

  app.get("/me/inbox", async (c) => {
    const { account } = await signed(c);
    const after = afterId(c.req.query("after"));
    const inbox: Inbox = { questions: await store.unansweredFor(account), roundsWaiting: [], matches: [], newMessages: [] };

    const seen = new Set<number>();
    const note = (deal: ChainDeal, listingId: string, title: string, role: "seller" | "buyer") => {
      if (!isMatched(deal)) return;
      seen.add(deal.id);
      const counterparty = role === "seller" ? deal.buyer : deal.seller;
      inbox.matches.push({ listingId, title, dealId: deal.id, role, counterparty: counterparty ?? "", state: deal.state });
    };

    for (const listing of await store.listBySeller(account)) {
      for (const slot of (await store.slotsOf(listing.id)).filter((s) => s.buyerAccount !== null)) {
        const deal = await near.getDeal(slot.dealId);
        if (!deal) continue;
        if (sellerOwesRound(deal)) inbox.roundsWaiting.push({ listingId: listing.id, title: listing.title, dealId: deal.id, round: deal.round });
        else note(deal, listing.id, listing.title, "seller");
      }
    }
    for (const negotiation of await store.negotiationsOf(account)) {
      const deal = await near.getDeal(negotiation.dealId);
      if (deal) note(deal, negotiation.listingId, negotiation.title, "buyer");
    }
    inbox.newMessages = await store.messagesIn([...seen], after, account);
    return c.json(inbox);
  });

  app.get("/me/listings", async (c) => {
    const { account } = await signed(c);
    const listings = await store.listBySeller(account);
    const result: SellerListing[] = await Promise.all(
      listings.map(async (listing) => ({ ...listing, slots: await store.slotsOf(listing.id) })),
    );
    return c.json(result);
  });

  app.get("/me/negotiations", async (c) => {
    const { account } = await signed(c);
    return c.json(await store.negotiationsOf(account));
  });

  return app;
}
