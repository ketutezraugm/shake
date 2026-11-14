import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractClient, Deal } from "./contract";
import { claimSlot, loadNegotiation, machineTroubled, offerView, saveNegotiation, submitOffer, syncListing, wasHandedBack } from "./offer";
import { rememberSealed } from "./proof";
import type { Signer } from "./signer";

// A real compressed secp256k1 public key (the TEE test key); sealing needs a valid one.
const TEE_PUBKEY = "02466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27";
const RELAYER = "http://relayer.test";
const ASK = "4500000";
const ME = "buyer.testnet";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

const signer: Signer = { accountId: ME, signRequest: async () => ({ "x-account-id": ME }), call: async () => 0, send: async () => "" };

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 7,
    seller: "seller.testnet",
    buyer: ME,
    title: "listing:l1",
    description: "",
    link_hash: [],
    max_rounds: 2,
    round: 1,
    seller_cts: [[1]],
    buyer_cts: [],
    seller_commits: [[0]],
    buyer_commits: [],
    state: "Waiting",
    price: null,
    matched_at_ns: null,
    deadline_ns: null,
    matcher_retries: 0,
    ...overrides,
  };
}

describe("offerView", () => {
  it("lets the buyer make an offer while the round is open", () => {
    expect(offerView(deal({ buyer: null }), ME, null)).toEqual({ kind: "enter", round: 1, rounds: 2 });
    expect(offerView(deal(), ME, null)).toEqual({ kind: "enter", round: 1, rounds: 2 });
  });

  it("shows computing while the sealed machine runs", () => {
    expect(offerView(deal({ state: "Computing", buyer_cts: [[2]] }), ME, null)).toEqual({ kind: "computing" });
  });

  it("asks a buyer who has raised in round 2 to wait for the seller", () => {
    const waiting = deal({ round: 2, state: "Waiting", buyer_cts: [[2], [3]], seller_cts: [[1]] });

    expect(offerView(waiting, ME, null)).toEqual({ kind: "waitingSeller", round: 2, rounds: 2 });
  });

  it("offers a raise after a no-deal round with rounds left", () => {
    const retry = deal({ round: 2, state: "Retry", buyer_cts: [[2]], seller_cts: [[1]] });

    expect(offerView(retry, ME, null)).toEqual({ kind: "retry", round: 2, rounds: 2 });
  });

  it("ends in a final no deal, an expired match or a cancelled deal", () => {
    expect(offerView(deal({ state: "NoDeal", round: 2, buyer_cts: [[2], [3]], seller_cts: [[1], [1]] }), ME, null)).toEqual({ kind: "noDeal" });
    expect(offerView(deal({ state: "NoDeal", matched_at_ns: 1 }), ME, null)).toEqual({ kind: "expired" });
  });

  it("goes to payment on a match and tracks escrow to the end", () => {
    const matched = deal({ state: "Matched", price: "42000000000000000000000", matched_at_ns: 1, buyer_cts: [[2]] });

    expect(offerView(matched, ME, null)).toEqual({ kind: "matched", price: "42000000000000000000000" });
    expect(offerView({ ...matched, state: "Funded", deadline_ns: 9 }, ME, null, 1).kind).toBe("funded");
    expect(offerView({ ...matched, state: "Released" }, ME, null).kind).toBe("released");
    expect(offerView({ ...matched, state: "Refunded" }, ME, null).kind).toBe("refunded");
  });

  it("offers the money back once the delivery deadline has passed on a paid deal", () => {
    const paid = deal({ state: "Funded", price: "42", matched_at_ns: 1, buyer_cts: [[2]], deadline_ns: 1_000 });

    expect(offerView(paid, ME, null, 999)).toEqual({ kind: "funded", price: "42", deadlineNs: 1_000 });
    expect(offerView(paid, ME, null, 1_000).kind).toBe("funded"); // the contract refunds only strictly after the deadline
    expect(offerView(paid, ME, null, 1_001)).toEqual({ kind: "refundable", price: "42" });
    expect(offerView({ ...paid, deadline_ns: null }, ME, null, 1_001).kind).toBe("funded");
  });

  it("shows 'another buyer got there first' when a different deal holds the reservation", () => {
    const matched = deal({ state: "Matched", price: "1", matched_at_ns: 1 });

    expect(offerView(matched, ME, { reservedDealId: 99 }).kind).toBe("beaten");
    expect(offerView(matched, ME, { reservedDealId: 7 }).kind).toBe("matched");
    expect(offerView(matched, ME, { reservedDealId: null }).kind).toBe("matched");
  });

  it("refuses an account that is not the deal's buyer", () => {
    expect(offerView(deal({ buyer: "someone.else" }), ME, null)).toEqual({ kind: "notYours" });
  });
});

describe("machine trouble", () => {
  it("knows a round was handed back only when this browser sealed an offer the chain no longer holds", () => {
    const handedBack = deal({ id: 31, matcher_retries: 1, state: "Waiting", round: 1, buyer_cts: [], seller_cts: [] });
    expect(wasHandedBack(handedBack)).toBe(false); // nothing was ever sealed here

    rememberSealed(31, 1, "1800000", "salt");
    expect(wasHandedBack(handedBack)).toBe(true);
    expect(wasHandedBack({ ...handedBack, buyer_cts: [[2]] })).toBe(false); // the offer is on the chain again
    expect(wasHandedBack({ ...handedBack, round: 2 })).toBe(false); // round 2 has not been sealed yet
  });

  it("flags a deal whose machine failed as often as the contract tolerates", () => {
    expect(machineTroubled(deal({ matcher_retries: 2 }))).toBe(false);
    expect(machineTroubled(deal({ matcher_retries: 3 }))).toBe(true);
  });
});

function fakeClient() {
  const submitted: { dealId: number; ct: number[]; commit: number[]; linkToken: string | null }[] = [];
  const client = {
    submitLimit: async (dealId: number, ct: number[], commit: number[], linkToken: string | null) => {
      submitted.push({ dealId, ct, commit, linkToken });
    },
  } as unknown as ContractClient;
  return { client, submitted };
}

const offerInput = (over: Partial<Parameters<typeof submitOffer>[0]> = {}) => ({
  deal: deal({ buyer: null }),
  limit: "4200000",
  askingPrice: ASK,
  linkToken: "tok",
  client: fakeClient().client,
  teePubkey: TEE_PUBKEY,
  ...over,
});

describe("submitOffer", () => {
  beforeEach(() => store.clear());

  it("seals the offer and sends the link token on the buyer's first submit only", async () => {
    const chain = fakeClient();

    await submitOffer(offerInput({ client: chain.client }));
    await submitOffer(offerInput({ client: chain.client, deal: deal({ round: 2, state: "Retry", buyer: ME }), limit: "4300000" }));

    expect(chain.submitted.map((s) => s.linkToken)).toEqual(["tok", null]);
    expect(chain.submitted[0]?.ct.length).toBeGreaterThan(60);
    expect(chain.submitted[0]?.commit).toHaveLength(32);
  });

  it("accepts an offer equal to the asking price", async () => {
    const chain = fakeClient();

    await submitOffer(offerInput({ client: chain.client, limit: ASK }));

    expect(chain.submitted).toHaveLength(1);
  });

  it.each([
    ["above the asking price", { limit: "4500001" }, "above the asking price. The most you can offer is Rp 4.500.000"],
    ["not whole Rupiah", { limit: "4,200,000" }, "whole Rupiah"],
    ["zero", { limit: "0" }, "whole Rupiah"],
  ])("refuses an offer %s before sealing or paying a fee", async (_name, over, message) => {
    const chain = fakeClient();

    await expect(submitOffer(offerInput({ client: chain.client, ...over }))).rejects.toThrow(message);

    expect(chain.submitted).toHaveLength(0);
  });

  it("refuses to lower an offer in a later round", async () => {
    const chain = fakeClient();
    await submitOffer(offerInput({ client: chain.client, limit: "4200000" }));

    await expect(
      submitOffer(offerInput({ client: chain.client, deal: deal({ round: 2, state: "Retry", buyer: ME }), limit: "4100000" })),
    ).rejects.toThrow("only raise your offer");

    expect(chain.submitted).toHaveLength(1);
  });
});

describe("claimSlot and syncListing", () => {
  beforeEach(() => store.clear());

  it("claims a slot, keeps the token for this browser and returns the deal", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push(`${init.method} ${url}`);
      return Response.json({ dealId: 7, linkToken: "tok" });
    });

    const claim = await claimSlot(RELAYER, signer, { id: "l1", title: "Kamera", askingPrice: ASK });

    expect(claim).toEqual({ dealId: 7, linkToken: "tok" });
    expect(seen).toEqual([`POST ${RELAYER}/listings/l1/claim`]);
    expect(loadNegotiation(7)).toEqual({ listingId: "l1", title: "Kamera", askingPrice: ASK, linkToken: "tok" });
  });

  it("explains a full listing in words", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "no free slot" }, { status: 409 }));

    await expect(claimSlot(RELAYER, signer, { id: "l1", title: "K", askingPrice: ASK })).rejects.toThrow("Starting your offer failed: no free slot");
  });

  it("asks the relayer to re-read the listing after a chain change", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push(`${init.method} ${url}`);
      return Response.json({ id: "l1", status: "reserved" });
    });

    await syncListing(RELAYER, "l1");
    saveNegotiation(1, { listingId: "l1", title: "t", askingPrice: "1", linkToken: "x" });

    expect(seen).toEqual([`POST ${RELAYER}/listings/l1/sync`]);
  });
});
