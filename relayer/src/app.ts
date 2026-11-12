import { createHash } from "node:crypto";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createAuthenticator } from "./auth.js";
import { HttpError } from "./errors.js";
import type { NearReader } from "./near.js";
import { rateLimit } from "./rateLimit.js";
import type { Store } from "./store.js";
import type { ClaimRes, Listing, ListingPage, SellerListing } from "./types.js";
import { MAX_PHOTOS, MAX_SLOTS, parseCategory, parseCreateListing, parsePhotoReq, parseSlots } from "./validate.js";

export type Deps = {
  store: Store;
  near: NearReader;
  allowedOrigin: string;
  now?: () => number;
};

const PAGE_SIZE = 20;
const REQUESTS_PER_MINUTE = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// A deal that has taken the buyer's money ends the listing; the other states can still fall through.
const SOLD_STATES = new Set(["Funded", "Released"]);

export function createApp({ store, near, allowedOrigin, now = Date.now }: Deps) {
  const app = new Hono();
  const authenticate = createAuthenticator(near, now);

  app.use(
    cors({
      origin: allowedOrigin,
      allowHeaders: ["content-type", "x-account-id", "x-public-key", "x-timestamp", "x-signature"],
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );
  app.use(rateLimit(REQUESTS_PER_MINUTE, now));

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  /** Reads the body once, verifies the signature over it, and returns the caller with the parsed JSON. */
  async function signed(c: Context): Promise<{ account: string; body: unknown }> {
    const raw = await c.req.text();
    const account = await authenticate({ method: c.req.method, path: c.req.path, body: raw, header: (name) => c.req.header(name) });
    if (raw === "") return { account, body: {} };
    try {
      return { account, body: JSON.parse(raw) };
    } catch {
      throw new HttpError(400, "body must be JSON");
    }
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
    const slot: ClaimRes | null = await store.claim(listing.id, account);
    if (!slot) throw new HttpError(409, "no free slot: the seller is negotiating with other buyers");
    return c.json(slot);
  });

  app.post("/listings/:id/close", async (c) => {
    const { account } = await signed(c);
    const listing = await ownListing(c.req.param("id"), account);
    if (listing.status !== "open") throw new HttpError(409, "listing is not open");
    await store.setStatus(listing.id, "closed");
    return c.json({ ...listing, status: "closed" });
  });

  app.post("/listings/:id/sync", async (c) => {
    const listing = await findListing(c.req.param("id"));
    if (listing.status !== "open") return c.json(listing);
    const deals = await Promise.all((await store.slotsOf(listing.id)).map((slot) => near.getDeal(slot.dealId)));
    if (!deals.some((deal) => deal && SOLD_STATES.has(deal.state))) return c.json(listing);
    await store.setStatus(listing.id, "sold");
    return c.json({ ...listing, status: "sold" });
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
