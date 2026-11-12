import { createHash } from "node:crypto";
import { KeyPair } from "near-api-js";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { signingMessage } from "./auth.js";
import { FakeNear, FakeStore } from "./fakes.js";
import type { ChainDeal } from "./near.js";
import type { Listing } from "./types.js";

type Person = { account: string; key: KeyPair };

let store: FakeStore;
let near: FakeNear;
let app: ReturnType<typeof createApp>;

function person(account: string): Person {
  const key = KeyPair.fromRandom("ed25519");
  near.keys.add(`${account}|${key.getPublicKey().toString()}`);
  return { account, key };
}

async function call(who: Person | null, method: "GET" | "POST" | "PUT", path: string, body?: unknown) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) {
    const timestamp = String(Date.now());
    const signature = Buffer.from(who.key.sign(signingMessage(method, new URL(path, "http://x").pathname, raw, timestamp)).signature).toString("base64");
    Object.assign(headers, {
      "x-account-id": who.account,
      "x-public-key": who.key.getPublicKey().toString(),
      "x-timestamp": timestamp,
      "x-signature": signature,
    });
  }
  const response = await app.request(path, { method, headers, body: method === "GET" ? undefined : raw });
  // The helper reads a different response shape in every test, so the body stays loosely typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: response.status, json: (await response.json()) as any };
}

function chainDeal(id: number, seller: string, token: string, patch: Partial<ChainDeal> = {}): ChainDeal {
  const link_hash = [...createHash("sha256").update(token).digest()];
  return { id, seller, buyer: null, link_hash, max_rounds: 2, round: 1, state: "Waiting", ...patch };
}

const listingBody = { title: "Used bike", description: "Works fine", category: "vehicles", maxRounds: 2, askingPrice: "1500000" };

async function newListing(seller: Person): Promise<Listing> {
  const { json } = await call(seller, "POST", "/listings", listingBody);
  return json;
}

beforeEach(() => {
  store = new FakeStore();
  near = new FakeNear();
  app = createApp({ store, near, allowedOrigin: "http://localhost:5173" });
});

describe("listings", () => {
  it("creates a listing for the signed account and shows it in browse", async () => {
    const seller = person("ann.test");
    const created = await call(seller, "POST", "/listings", listingBody);
    expect(created.status).toBe(201);
    expect(created.json.sellerAccount).toBe("ann.test");

    const browse = await call(null, "GET", "/listings");
    expect(browse.json.listings).toHaveLength(1);
  });

  it("rejects an unsigned write and invalid input", async () => {
    expect((await call(null, "POST", "/listings", listingBody)).status).toBe(401);
    const seller = person("ann.test");
    expect((await call(seller, "POST", "/listings", { ...listingBody, maxRounds: 4 })).status).toBe(400);
    expect((await call(seller, "POST", "/listings", { ...listingBody, category: "cars" })).status).toBe(400);
    expect((await call(seller, "POST", "/listings", { ...listingBody, title: "" })).status).toBe(400);
  });

  it("filters by category and keyword", async () => {
    const seller = person("ann.test");
    await newListing(seller);
    await call(seller, "POST", "/listings", { ...listingBody, title: "Blue jacket", category: "fashion" });

    expect((await call(null, "GET", "/listings?category=fashion")).json.listings).toHaveLength(1);
    expect((await call(null, "GET", "/listings?q=bike")).json.listings).toHaveLength(1);
    expect((await call(null, "GET", "/listings?category=nope")).status).toBe(400);
  });

  it("answers 404 for an unknown or malformed id", async () => {
    expect((await call(null, "GET", "/listings/not-a-uuid")).status).toBe(404);
  });

  it("limits a listing to four photos and to its seller", async () => {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    const path = `/listings/${listing.id}/photos`;
    for (let i = 0; i < 4; i++) expect((await call(seller, "POST", path, { contentType: "image/png" })).status).toBe(201);
    expect((await call(seller, "POST", path, { contentType: "image/png" })).status).toBe(409);
    expect((await call(person("eve.test"), "POST", path, { contentType: "image/png" })).status).toBe(403);
    expect((await call(seller, "POST", path, { contentType: "image/gif" })).status).toBe(400);
  });
});

describe("slots", () => {
  async function register(seller: Person, listing: Listing, dealId: number, token: string) {
    return call(seller, "POST", `/listings/${listing.id}/slots`, { slots: [{ dealId, linkToken: token }] });
  }

  it("registers a slot backed by the seller's waiting deal", async () => {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    near.deals.set(7, chainDeal(7, "ann.test", "tok7"));
    expect((await register(seller, listing, 7, "tok7")).status).toBe(201);
    expect((await call(null, "GET", `/listings/${listing.id}`)).json.freeSlots).toBe(1);
  });

  it.each([
    ["a deal of another seller", chainDeal(7, "eve.test", "tok7")],
    ["a deal that is not waiting", chainDeal(7, "ann.test", "tok7", { state: "Created" })],
    ["a deal that already has a buyer", chainDeal(7, "ann.test", "tok7", { buyer: "bob.test" })],
    ["a deal with another round count", chainDeal(7, "ann.test", "tok7", { max_rounds: 3 })],
    ["a token that does not open the deal", chainDeal(7, "ann.test", "other")],
  ])("rejects %s", async (_name, deal) => {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    near.deals.set(7, deal);
    expect((await register(seller, listing, 7, "tok7")).status).toBe(400);
  });

  it("rejects a deal that does not exist and registration by another account", async () => {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    expect((await register(seller, listing, 99, "tok")).status).toBe(400);
    near.deals.set(7, chainDeal(7, "ann.test", "tok7"));
    expect((await register(person("eve.test"), listing, 7, "tok7")).status).toBe(403);
  });
});

describe("claim", () => {
  async function listingWithSlots(count: number) {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    for (let id = 1; id <= count; id++) near.deals.set(id, chainDeal(id, "ann.test", `tok${id}`));
    const slots = Array.from({ length: count }, (_, i) => ({ dealId: i + 1, linkToken: `tok${i + 1}` }));
    await call(seller, "POST", `/listings/${listing.id}/slots`, { slots });
    return { seller, listing };
  }

  it("gives each buyer their own slot and the same one on a repeat", async () => {
    const { listing } = await listingWithSlots(2);
    const bob = person("bob.test");
    const first = await call(bob, "POST", `/listings/${listing.id}/claim`);
    const again = await call(bob, "POST", `/listings/${listing.id}/claim`);
    const carol = await call(person("carol.test"), "POST", `/listings/${listing.id}/claim`);

    expect(first.json).toEqual(again.json);
    expect(carol.json.dealId).not.toBe(first.json.dealId);
  });

  it("answers 409 when every slot is taken", async () => {
    const { listing } = await listingWithSlots(1);
    await call(person("bob.test"), "POST", `/listings/${listing.id}/claim`);
    expect((await call(person("carol.test"), "POST", `/listings/${listing.id}/claim`)).status).toBe(409);
  });

  it("refuses the seller and listings that are no longer open", async () => {
    const { seller, listing } = await listingWithSlots(1);
    expect((await call(seller, "POST", `/listings/${listing.id}/claim`)).status).toBe(403);
    await call(seller, "POST", `/listings/${listing.id}/close`);
    expect((await call(person("bob.test"), "POST", `/listings/${listing.id}/claim`)).status).toBe(409);
  });

  it("lists the buyer's negotiations with the link token, and the seller's slots without it", async () => {
    const { seller, listing } = await listingWithSlots(1);
    const bob = person("bob.test");
    await call(bob, "POST", `/listings/${listing.id}/claim`);

    const mine = await call(bob, "GET", "/me/negotiations");
    expect(mine.json).toEqual([expect.objectContaining({ dealId: 1, linkToken: "tok1" })]);
    const selling = await call(seller, "GET", "/me/listings");
    expect(selling.json[0].slots).toEqual([{ dealId: 1, buyerAccount: "bob.test" }]);
  });
});

describe("asking price", () => {
  it("create_listing_requires_asking_price", async () => {
    const seller = person("ann.test");
    expect((await call(seller, "POST", "/listings", { ...listingBody, askingPrice: undefined })).status).toBe(400);
    for (const askingPrice of ["0", "01", "1.5", "-5", "1,000", "", 1500000, "9007199254740992"]) {
      expect((await call(seller, "POST", "/listings", { ...listingBody, askingPrice })).status).toBe(400);
    }
    expect((await call(seller, "POST", "/listings", { ...listingBody, askingPrice: "9007199254740991" })).status).toBe(201);
  });

  it("listing_responses_carry_asking_price", async () => {
    const seller = person("ann.test");
    const created = await call(seller, "POST", "/listings", listingBody);
    expect(created.json.askingPrice).toBe("1500000");
    expect((await call(null, "GET", `/listings/${created.json.id}`)).json.askingPrice).toBe("1500000");
    expect((await call(null, "GET", "/listings")).json.listings[0].askingPrice).toBe("1500000");
    expect((await call(seller, "GET", "/me/listings")).json[0].askingPrice).toBe("1500000");
  });
});

describe("sync", () => {
  async function listingWithDeals(count: number) {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    for (let id = 1; id <= count; id++) near.deals.set(id, chainDeal(id, "ann.test", `tok${id}`));
    const slots = Array.from({ length: count }, (_, i) => ({ dealId: i + 1, linkToken: `tok${i + 1}` }));
    await call(seller, "POST", `/listings/${listing.id}/slots`, { slots });
    return listing;
  }
  const sync = async (listing: Listing) => (await call(null, "POST", `/listings/${listing.id}/sync`)).json.status;
  const setDeal = (id: number, patch: Partial<ChainDeal>) => near.deals.set(id, chainDeal(id, "ann.test", `tok${id}`, { buyer: "bob.test", ...patch }));

  it("reserves the listing once a deal is matched, and not before", async () => {
    const listing = await listingWithDeals(1);
    setDeal(1, { state: "Waiting" });
    expect(await sync(listing)).toBe("open");
    setDeal(1, { state: "Matched" });
    expect(await sync(listing)).toBe("reserved");
    expect((await call(null, "GET", "/listings")).json.listings).toHaveLength(0);
  });

  it("returns the reserving deal on the listing while it is reserved, and null otherwise", async () => {
    const listing = await listingWithDeals(2);
    const read = async () => (await call(null, "GET", `/listings/${listing.id}`)).json.reservedDealId;
    expect(await read()).toBeNull();
    setDeal(2, { state: "Matched" });
    expect((await call(null, "POST", `/listings/${listing.id}/sync`)).json.reservedDealId).toBe(2);
    expect(await read()).toBe(2);
    setDeal(2, { state: "Released" });
    expect((await call(null, "POST", `/listings/${listing.id}/sync`)).json.reservedDealId).toBeNull();
    expect(await read()).toBeNull();
  });

  it("sells the listing once a deal is released", async () => {
    const listing = await listingWithDeals(1);
    setDeal(1, { state: "Matched" });
    await sync(listing);
    setDeal(1, { state: "Released" });
    expect(await sync(listing)).toBe("sold");
  });

  it("reopens the listing when the reserving deal expires or is refunded", async () => {
    const listing = await listingWithDeals(1);
    setDeal(1, { state: "Funded" });
    expect(await sync(listing)).toBe("reserved");
    setDeal(1, { state: "NoDeal", matched_at_ns: 5 });
    expect(await sync(listing)).toBe("open");
    setDeal(1, { state: "Funded" });
    await sync(listing);
    setDeal(1, { state: "Refunded", matched_at_ns: 5 });
    expect(await sync(listing)).toBe("open");
  });

  it("keeps the first reservation when a second deal also matches", async () => {
    const listing = await listingWithDeals(2);
    setDeal(2, { state: "Matched" });
    await sync(listing);
    setDeal(1, { state: "Matched" });
    await sync(listing);
    expect(store.reservedDeals.get(listing.id)).toBe(2);
    setDeal(2, { state: "NoDeal", matched_at_ns: 5 });
    expect(await sync(listing)).toBe("open");
  });

  it("refuses claims unless the listing is open", async () => {
    const listing = await listingWithDeals(2);
    setDeal(1, { state: "Matched" });
    await sync(listing);
    expect((await call(person("carol.test"), "POST", `/listings/${listing.id}/claim`)).status).toBe(409);
  });
});

const profileBody = { displayName: "Demo Shop", bio: "Second-hand finds", city: "Yogyakarta", avatarUrl: null };

describe("profiles", () => {
  it("shows open and reserved listings and the sold count, and 404s an unknown handle", async () => {
    const seller = person("demo.testnet");
    store.profiles.push({ accountId: seller.account, handle: "demo", auth: "email", supabaseUserId: "u1" });
    const open = await newListing(seller);
    const reserved = await newListing(seller);
    const sold = await newListing(seller);
    await store.setStatus(reserved.id, "reserved", 1);
    await store.setStatus(sold.id, "sold");

    const { status, json } = await call(null, "GET", "/profiles/demo");
    expect(status).toBe(200);
    expect(json.profile.handle).toBe("demo");
    expect(json.profile).not.toHaveProperty("supabaseUserId");
    expect(json.listings.map((l: Listing) => l.id).sort()).toEqual([open.id, reserved.id].sort());
    expect(json.soldCount).toBe(1);
    expect((await call(null, "GET", "/profiles/nobody")).status).toBe(404);
  });

  it("lets a wallet user create a profile once with a handle, then edit it without changing the handle", async () => {
    const wallet = person("alice.testnet");
    expect((await call(wallet, "PUT", "/me/profile", profileBody)).status).toBe(400);

    const created = await call(wallet, "PUT", "/me/profile", { ...profileBody, handle: "alice" });
    expect(created.status).toBe(200);
    expect(store.profiles[0]).toMatchObject({ accountId: "alice.testnet", handle: "alice", auth: "wallet" });

    const edited = await call(wallet, "PUT", "/me/profile", { ...profileBody, handle: "other", city: "Bali" });
    expect(edited.json).toMatchObject({ handle: "alice", city: "Bali" });
  });

  it("refuses a handle another account already holds", async () => {
    store.profiles.push({ accountId: "bob.testnet", handle: "taken", auth: "email", supabaseUserId: "u2" });
    const { status } = await call(person("alice.testnet"), "PUT", "/me/profile", { ...profileBody, handle: "taken" });
    expect(status).toBe(409);
  });
});

describe("questions", () => {
  let seller: Person;
  let asker: Person;
  let listing: Listing;
  beforeEach(async () => {
    seller = person("seller.testnet");
    asker = person("asker.testnet");
    listing = await newListing(seller);
  });

  it("answer_only_by_listing_seller", async () => {
    const { json: asked } = await call(asker, "POST", `/listings/${listing.id}/questions`, { question: "Any scratches?" });
    expect((await call(asker, "POST", `/questions/${asked.id}/answer`, { answer: "No" })).status).toBe(403);
    expect((await call(seller, "POST", `/questions/${asked.id}/answer`, { answer: "A small one" })).status).toBe(200);
    expect((await call(seller, "POST", `/questions/${asked.id}/answer`, { answer: "Again" })).status).toBe(409);
  });

  it("unanswered_questions_not_public", async () => {
    const { json: asked } = await call(asker, "POST", `/listings/${listing.id}/questions`, { question: "Any scratches?" });
    expect((await call(null, "GET", `/listings/${listing.id}/questions`)).json).toEqual([]);

    await call(seller, "POST", `/questions/${asked.id}/answer`, { answer: "A small one" });
    const { json } = await call(null, "GET", `/listings/${listing.id}/questions`);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({ question: "Any scratches?", answer: "A small one" });
  });

  it("refuses the seller asking on their own listing and an empty question", async () => {
    expect((await call(seller, "POST", `/listings/${listing.id}/questions`, { question: "Hi" })).status).toBe(403);
    expect((await call(asker, "POST", `/listings/${listing.id}/questions`, { question: "" })).status).toBe(400);
  });
});

describe("messages", () => {
  let seller: Person;
  let buyer: Person;
  beforeEach(() => {
    seller = person("seller.testnet");
    buyer = person("buyer.testnet");
    near.deals.set(7, chainDeal(7, seller.account, "t", { buyer: buyer.account, state: "Matched" }));
  });

  it("messages_refused_for_non_party_and_pre_match", async () => {
    const stranger = person("stranger.testnet");
    expect((await call(stranger, "GET", "/deals/7/messages")).status).toBe(403);
    expect((await call(stranger, "POST", "/deals/7/messages", { body: "hi" })).status).toBe(403);
    expect((await call(null, "GET", "/deals/7/messages")).status).toBe(401);
    expect((await call(buyer, "GET", "/deals/99/messages")).status).toBe(404);

    near.deals.set(8, chainDeal(8, seller.account, "u", { buyer: buyer.account, state: "Retry" }));
    expect((await call(buyer, "POST", "/deals/8/messages", { body: "hi" })).status).toBe(409);
    near.deals.set(9, chainDeal(9, seller.account, "v", { buyer: buyer.account, state: "NoDeal" }));
    expect((await call(buyer, "GET", "/deals/9/messages")).status).toBe(409);
  });

  it("lets both parties exchange messages and poll from the last id", async () => {
    await call(buyer, "POST", "/deals/7/messages", { body: "Is it still there?" });
    await call(seller, "POST", "/deals/7/messages", { body: "Yes" });

    const all = await call(seller, "GET", "/deals/7/messages");
    expect(all.json.map((m: { body: string }) => m.body)).toEqual(["Is it still there?", "Yes"]);
    const after = await call(buyer, "GET", `/deals/7/messages?after=${all.json[0].id}`);
    expect(after.json.map((m: { body: string }) => m.body)).toEqual(["Yes"]);
    expect((await call(buyer, "POST", "/deals/7/messages", { body: "" })).status).toBe(400);
  });
});

describe("inbox", () => {
  it("inbox_lists_slots_waiting_for_seller_round", async () => {
    const seller = person("seller.testnet");
    const buyer = person("buyer.testnet");
    const listing = await newListing(seller);
    await store.addSlots(listing.id, [
      { dealId: 1, linkToken: "a" },
      { dealId: 2, linkToken: "b" },
    ]);
    await store.claim(listing.id, buyer.account);
    near.deals.set(1, chainDeal(1, seller.account, "a", { buyer: buyer.account, state: "Retry", round: 2 }));
    near.deals.set(2, chainDeal(2, seller.account, "b"));

    const { json } = await call(seller, "GET", "/me/inbox");
    expect(json.roundsWaiting).toEqual([{ listingId: listing.id, title: "Used bike", dealId: 1, round: 2 }]);
    expect((await call(buyer, "GET", "/me/inbox")).json.roundsWaiting).toEqual([]);
  });

  it("lists unanswered questions for the seller and matches for both sides, with unread messages", async () => {
    const seller = person("seller.testnet");
    const buyer = person("buyer.testnet");
    const listing = await newListing(seller);
    await call(buyer, "POST", `/listings/${listing.id}/questions`, { question: "Box included?" });
    await store.addSlots(listing.id, [{ dealId: 1, linkToken: "a" }]);
    await store.claim(listing.id, buyer.account);
    near.deals.set(1, chainDeal(1, seller.account, "a", { buyer: buyer.account, state: "Matched" }));
    await call(buyer, "POST", "/deals/1/messages", { body: "Hello" });

    const forSeller = (await call(seller, "GET", "/me/inbox")).json;
    expect(forSeller.questions).toMatchObject([{ question: "Box included?", listingTitle: "Used bike" }]);
    expect(forSeller.matches).toEqual([
      { listingId: listing.id, title: "Used bike", dealId: 1, role: "seller", counterparty: buyer.account, state: "Matched" },
    ]);
    expect(forSeller.newMessages.map((m: { body: string }) => m.body)).toEqual(["Hello"]);

    const forBuyer = (await call(buyer, "GET", "/me/inbox")).json;
    expect(forBuyer.questions).toEqual([]);
    expect(forBuyer.matches[0]).toMatchObject({ role: "buyer", counterparty: seller.account });
    expect(forBuyer.newMessages).toEqual([]);
    expect((await call(seller, "GET", `/me/inbox?after=${forSeller.newMessages[0].id}`)).json.newMessages).toEqual([]);
  });
});

describe("assistant", () => {
  it("answers a signed question from the listing, maps UNKNOWN, and stops at the account limit", async () => {
    app = createApp({ store, near, allowedOrigin: "http://localhost:5173", chat: async (m) => (m[1]!.content === "box?" ? "UNKNOWN" : "Works fine.") });
    const seller = person("seller.testnet");
    const buyer = person("buyer.testnet");
    const listing = await newListing(seller);

    expect((await call(null, "POST", "/assistant", { listingId: listing.id, question: "ok?" })).status).toBe(401);
    expect((await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "" })).status).toBe(400);
    expect((await call(buyer, "POST", "/assistant", { listingId: "nope", question: "ok?" })).status).toBe(404);
    expect((await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "ok?" })).json).toEqual({ answer: "Works fine." });
    expect((await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "box?" })).json).toEqual({ unknown: true });
    for (let i = 0; i < 18; i++) await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "ok?" });
    expect((await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "ok?" })).status).toBe(429);
  });

  it("answers 503 when no NEAR AI key is configured", async () => {
    const buyer = person("buyer.testnet");
    const listing = await newListing(person("seller.testnet"));
    expect((await call(buyer, "POST", "/assistant", { listingId: listing.id, question: "ok?" })).status).toBe(503);
  });
});
