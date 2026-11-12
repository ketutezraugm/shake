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

async function call(who: Person | null, method: "GET" | "POST", path: string, body?: unknown) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) {
    const timestamp = String(Date.now());
    const signature = Buffer.from(who.key.sign(signingMessage(method, path, raw, timestamp)).signature).toString("base64");
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
  return { id, seller, buyer: null, link_hash, max_rounds: 2, state: "Waiting", ...patch };
}

const listingBody = { title: "Used bike", description: "Works fine", category: "vehicles", maxRounds: 2 };

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

describe("sync", () => {
  it("marks the listing sold once a deal is funded, and not before", async () => {
    const seller = person("ann.test");
    const listing = await newListing(seller);
    near.deals.set(1, chainDeal(1, "ann.test", "tok1"));
    await call(seller, "POST", `/listings/${listing.id}/slots`, { slots: [{ dealId: 1, linkToken: "tok1" }] });

    near.deals.set(1, chainDeal(1, "ann.test", "tok1", { state: "Matched", buyer: "bob.test" }));
    expect((await call(null, "POST", `/listings/${listing.id}/sync`)).json.status).toBe("open");

    near.deals.set(1, chainDeal(1, "ann.test", "tok1", { state: "Funded", buyer: "bob.test" }));
    expect((await call(null, "POST", `/listings/${listing.id}/sync`)).json.status).toBe("sold");
    expect((await call(null, "GET", "/listings")).json.listings).toHaveLength(0);
  });
});
