import { describe, expect, it, vi } from "vitest";
import type { ContractClient, Deal } from "./contract";
import { loadMyOffers, rowText, sortRows, type OfferRow } from "./myOffers";
import type { OfferView } from "./offer";
import type { Signer } from "./signer";

const ME = "buyer.testnet";
const signer: Signer = { accountId: ME, signRequest: async () => ({ "x-account-id": ME }), call: async () => 0, send: async () => "" };
const PRICE = "150000000000000000000000"; // 0.15 NEAR in yoctoNEAR, Rp 15.000.000 at the demo rate

describe("rowText", () => {
  it("names the next step for every view that waits on the buyer", () => {
    const waiting: [OfferView, string][] = [
      [{ kind: "enter", round: 1, rounds: 2 }, "Make your offer"],
      [{ kind: "retry", round: 2, rounds: 2 }, "Raise your offer"],
      [{ kind: "matched", price: PRICE }, "Pay Rp 15.000.000"],
      [{ kind: "refundable", price: PRICE }, "Get my money back"],
    ];
    for (const [view, action] of waiting) expect(rowText(view)).toMatchObject({ action, yourMove: true });
  });

  it("gives no action when the seller, the machine or nobody is next", () => {
    const quiet: OfferView[] = [
      { kind: "waitingSeller", round: 2, rounds: 2 },
      { kind: "computing" },
      { kind: "beaten" },
      { kind: "noDeal" },
      { kind: "expired" },
    ];
    for (const view of quiet) expect(rowText(view)).toMatchObject({ action: null, yourMove: false });
    expect(rowText({ kind: "funded", price: PRICE, deadlineNs: null }).yourMove).toBe(false);
  });
});

describe("sortRows", () => {
  it("puts the deals waiting on the buyer first and keeps the rest in order", () => {
    const row = (dealId: number, view: OfferView): OfferRow => ({ dealId, listingId: "l", title: "t", view });
    const sorted = sortRows([row(1, { kind: "noDeal" }), row(2, { kind: "matched", price: PRICE }), row(3, { kind: "computing" })]);

    expect(sorted.map((r) => r.dealId)).toEqual([2, 1, 3]);
  });
});

describe("loadMyOffers", () => {
  const deal = (id: number, overrides: Partial<Deal>): Deal =>
    ({ id, buyer: ME, state: "Waiting", round: 1, max_rounds: 2, buyer_cts: [], price: null, deadline_ns: null, matched_at_ns: null, ...overrides }) as Deal;

  it("lists deals in progress and leaves out the ones that finished", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json([1, 2, 3].map((dealId) => ({ listingId: `l${dealId}`, title: `Item ${dealId}`, sellerAccount: "s.testnet", dealId, linkToken: "x" })), { status: 200 }),
    );
    const deals: Record<number, Deal> = {
      1: deal(1, {}),
      2: deal(2, { state: "Released", price: PRICE }),
      3: deal(3, { state: "Refunded" }),
    };
    const client = { getDeal: async (id: number) => deals[id] ?? null } as unknown as ContractClient;

    const rows = await loadMyOffers("http://relayer.test", signer, client, ME);

    expect(rows).toEqual([{ dealId: 1, listingId: "l1", title: "Item 1", view: { kind: "enter", round: 1, rounds: 2 } }]);
  });
});
