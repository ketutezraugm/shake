import { describe, expect, it } from "vitest";
import vectors from "../../tee/testvectors.json";
import { sealLimit } from "./crypto";
import { MOCK_TEE_PUBLIC_KEY, MOCK_TEE_SECRET_KEY, MockChain, mockClient, mockSigner, sha256 } from "./mockClient";

const YOCTO_PER_RP = 10n ** 16n;
const DAY_MS = 86_400_000;

/** A chain whose clock the test moves, so "computing" and the 24 h / delivery windows are instant to reach. */
function world(options: { deliveryWindowMs?: number } = {}) {
  const clock = { now: 1_000_000 };
  const chain = new MockChain([], { now: () => clock.now, ...options });
  const seller = mockClient(chain, "seller.test");
  const buyer = mockClient(chain, "buyer.test");
  const stranger = mockClient(chain, "stranger.test");
  return { chain, clock, seller, buyer, stranger };
}
type World = ReturnType<typeof world>;

async function offer(w: World, id: number, side: "seller" | "buyer", round: number, limit: string, token: string | null = null) {
  const sealed = await sealLimit(id, side, round, limit, MOCK_TEE_PUBLIC_KEY);
  await (side === "seller" ? w.seller : w.buyer).submitLimit(id, sealed.ct, sealed.commit, token);
}

/** Plays rounds `[sellerMin, buyerMax]` and lets the mock TEE answer; returns the deal after the last round. */
async function play(w: World, rounds: [string, string][], maxRounds = rounds.length) {
  const id = await w.seller.createDeal("Bike", "", await sha256("tok"), maxRounds);
  for (const [i, [min, max]] of rounds.entries()) {
    await offer(w, id, "seller", i + 1, min);
    await offer(w, id, "buyer", i + 1, max, i === 0 ? "tok" : null);
    w.clock.now += 5_000; // past the "computing" step
  }
  return { id, deal: (await w.seller.getDeal(id))! };
}

describe("the mock TEE key", () => {
  it("is the test key behind tee/testvectors.json", () => {
    expect(MOCK_TEE_SECRET_KEY).toBe(vectors.test_secret_key);
    expect(MOCK_TEE_PUBLIC_KEY).toBe(vectors.test_public_key);
  });
});

describe("matching, as the TEE does it", () => {
  it("matches at a price inside the overlap, after a Computing step", async () => {
    const w = world();
    const id = await w.seller.createDeal("Bike", "", await sha256("tok"), 1);
    await offer(w, id, "seller", 1, "4000000");
    await offer(w, id, "buyer", 1, "4600000", "tok");

    expect((await w.seller.getDeal(id))!.state).toBe("Computing");
    w.clock.now += 5_000;
    const deal = (await w.seller.getDeal(id))!;

    const priceRp = BigInt(deal.price!) / YOCTO_PER_RP;
    expect(deal.state).toBe("Matched");
    expect(priceRp >= 4_000_000n && priceRp <= 4_600_000n).toBe(true);
    expect(deal.matched_at_ns).not.toBeNull();
  });

  it("ends in no deal without an overlap, or retries while rounds remain", async () => {
    expect((await play(world(), [["5000000", "4000000"]])).deal).toMatchObject({ state: "NoDeal", price: null });
    expect((await play(world(), [["5000000", "4000000"]], 2)).deal).toMatchObject({ state: "Retry", round: 2 });
  });

  it("matches a later round only if neither side backed off (buyer up, seller down)", async () => {
    const state = async (rounds: [string, string][]) => (await play(world(), rounds)).deal.state;

    expect(await state([["5000000", "4000000"], ["4500000", "4600000"]])).toBe("Matched");
    expect(await state([["5000000", "4000000"], ["3000000", "3500000"]])).toBe("NoDeal"); // buyer lowered
    expect(await state([["5000000", "4000000"], ["5500000", "6000000"]])).toBe("NoDeal"); // seller raised
  });

  it("treats a ciphertext that was not sealed for this deal as invalid, which counts as a no-deal", async () => {
    const w = world();
    const id = await w.seller.createDeal("Bike", "", await sha256("tok"), 1);
    const other = await sealLimit(id + 99, "seller", 1, "1", MOCK_TEE_PUBLIC_KEY); // sealed for another deal
    await w.seller.submitLimit(id, other.ct, other.commit, null);
    await offer(w, id, "buyer", 1, "9000000", "tok");
    w.clock.now += 5_000;

    expect((await w.seller.getDeal(id))!.state).toBe("NoDeal");
  });
});

describe("contract rules and messages", () => {
  it("create_deal bounds", async () => {
    const { seller } = world();
    await expect(seller.createDeal("Bike", "", [], 4)).rejects.toThrow("max_rounds must be 1-3");
    await expect(seller.createDeal("", "", [], 1)).rejects.toThrow("title must be 1-100 bytes");
    await expect(seller.createDeal("x", "d".repeat(1001), [], 1)).rejects.toThrow("description must be at most 1000 bytes");
  });

  it("submit_limit: seller first, token, one buyer, once per round", async () => {
    const w = world();
    const id = await w.seller.createDeal("Bike", "", await sha256("tok"), 2);
    const sealed = await sealLimit(id, "buyer", 1, "4000000", MOCK_TEE_PUBLIC_KEY);

    await expect(w.buyer.submitLimit(id, sealed.ct, sealed.commit, "tok")).rejects.toThrow("the seller submits first");
    await offer(w, id, "seller", 1, "5000000");
    await expect(w.buyer.submitLimit(id, sealed.ct, sealed.commit, null)).rejects.toThrow("link token required");
    await expect(w.buyer.submitLimit(id, sealed.ct, sealed.commit, "wrong")).rejects.toThrow("invalid link token");
    await w.buyer.submitLimit(id, sealed.ct, sealed.commit, "tok");
    await expect(w.buyer.submitLimit(id, sealed.ct, sealed.commit, null)).rejects.toThrow("deal is not accepting limits"); // Computing

    w.clock.now += 5_000; // no overlap, so round 2 opens for both sides
    const buyerAgain = await sealLimit(id, "buyer", 2, "4100000", MOCK_TEE_PUBLIC_KEY);
    await expect(w.stranger.submitLimit(id, buyerAgain.ct, buyerAgain.commit, "tok")).rejects.toThrow("only the deal's buyer can submit");
    await w.buyer.submitLimit(id, buyerAgain.ct, buyerAgain.commit, null);
    await expect(w.buyer.submitLimit(id, buyerAgain.ct, buyerAgain.commit, null)).rejects.toThrow("already submitted this round");
  });

  it("rejects a ciphertext over 512 bytes", async () => {
    const w = world();
    const id = await w.seller.createDeal("Bike", "", [], 1);
    await expect(w.seller.submitLimit(id, Array(513).fill(1), Array(32).fill(0), null)).rejects.toThrow("ciphertext too large");
  });

  it("escrow: only the buyer deposits and confirms; refund waits for the deadline; unfunded matches expire after 24 h", async () => {
    const w = world({ deliveryWindowMs: 30_000 });
    const { id } = await play(w, [["4000000", "4600000"]]);

    await expect(w.stranger.deposit(id)).rejects.toThrow("only the buyer can deposit");
    await expect(w.buyer.confirmReceived(id)).rejects.toThrow("deal is not funded");
    await expect(w.stranger.expire(id)).rejects.toThrow("too early to expire");
    await w.buyer.deposit(id);
    await expect(w.stranger.confirmReceived(id)).rejects.toThrow("only the buyer can confirm");
    await expect(w.stranger.refund(id)).rejects.toThrow("the deadline has not passed");

    w.clock.now += 31_000;
    await w.stranger.refund(id); // anyone may, once the deadline has passed
    expect((await w.seller.getDeal(id))!.state).toBe("Refunded");
  });

  it("a deposit after the 24 h funding window is refused, and the match expires", async () => {
    const w = world();
    const { id } = await play(w, [["4000000", "4600000"]]);

    w.clock.now += DAY_MS + 1_000;

    await expect(w.buyer.deposit(id)).rejects.toThrow("the funding window has passed");
    await w.stranger.expire(id);
    expect((await w.seller.getDeal(id))!.state).toBe("NoDeal");
  });

  it("confirm_received pays out, and cancel is the seller's before both sides are in", async () => {
    const w = world();
    const { id } = await play(w, [["4000000", "4600000"]]);
    await w.buyer.deposit(id);
    await w.buyer.confirmReceived(id);
    expect((await w.seller.getDeal(id))!.state).toBe("Released");

    const open = await w.seller.createDeal("Lamp", "", [], 1);
    await expect(w.stranger.cancel(open)).rejects.toThrow("only the seller can cancel");
    await w.seller.cancel(open);
    await expect(w.seller.cancel(open)).rejects.toThrow("too late to cancel");
  });

  it("answers null for a deal that does not exist and panics when acting on one", async () => {
    const { seller } = world();
    expect(await seller.getDeal(99)).toBeNull();
    expect(await seller.getState(99)).toBeNull();
    await expect(seller.cancel(99)).rejects.toThrow("no such deal");
  });
});

describe("mockSigner", () => {
  it("is a Signer for the account, with placeholder headers and no direct calls", async () => {
    const signer = mockSigner("alice.test");

    expect(signer.accountId).toBe("alice.test");
    expect((await signer.signRequest("GET", "/x", ""))["x-account-id"]).toBe("alice.test");
    await expect(signer.call("create_deal", {})).rejects.toThrow(/ContractClient/);
  });
});
