import { describe, expect, it, vi } from "vitest";
import type { SellerListing } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { loadOrders, orderFromDeal, ORDER_TABS, tabOf } from "./orders";
import type { Signer } from "./signer";

const listing = (overrides: Partial<SellerListing> = {}): SellerListing => ({ id: "l1", title: "Camera", askingPrice: "1250000", photoUrls: ["https://x/p.jpg"], slots: [], ...overrides }) as SellerListing;
const deal = (state: Deal["state"], overrides: Partial<Deal> = {}): Deal =>
  ({ id: 5, state, buyer: "b.testnet", price: "1000000000000000000000000", matched_at_ns: 10, ...overrides }) as Deal;

describe("orderFromDeal", () => {
  it("carries the photo, the asking price and the negotiated price", () => {
    // 1 NEAR = Rp 100.000.000 on testnet, so 10^22 yocto is Rp 1.000.000.
    const order = orderFromDeal(listing(), deal("Matched", { price: "10000000000000000000000" }));
    expect(order).toMatchObject({ photoUrl: "https://x/p.jpg", askingRp: "1250000", dealRp: "1000000", belowAskingPct: 20 });
    expect(orderFromDeal(listing({ photoUrls: [] }), deal("Matched"))?.photoUrl).toBeNull();
  });

  it("files a matched or funded deal under new orders", () => {
    expect(orderFromDeal(listing(), deal("Matched"))).toMatchObject({ state: "Waiting for payment", tab: "new" });
    expect(orderFromDeal(listing(), deal("Funded"))).toMatchObject({ state: "Paid, hand it over", tab: "new" });
  });

  it("files a paid-out deal under done", () => {
    expect(orderFromDeal(listing(), deal("Released"))).toMatchObject({ state: "Paid out", tab: "done" });
  });

  it("files an unpaid-expired or refunded deal under cancelled", () => {
    expect(orderFromDeal(listing(), deal("NoDeal"))).toMatchObject({ state: "Buyer did not pay in time", tab: "cancelled" });
    expect(orderFromDeal(listing(), deal("Refunded"))).toMatchObject({ state: "Refunded to the buyer", tab: "cancelled" });
  });

  it("is not an order when the offers never matched", () => {
    expect(orderFromDeal(listing(), deal("NoDeal", { matched_at_ns: null, price: null }))).toBeNull();
    expect(orderFromDeal(listing(), deal("Waiting", { matched_at_ns: null }))).toBeNull();
  });
});

describe("tabOf", () => {
  it("reads the status query and falls back to all", () => {
    expect(tabOf("?tab=orders&status=done")).toBe("done");
    expect(tabOf("?tab=orders&status=nope")).toBe("all");
    expect(tabOf("")).toBe("all");
    expect(ORDER_TABS.map((t) => t.key)).toEqual(["all", "new", "done", "cancelled"]);
  });
});

describe("loadOrders", () => {
  it("reads only claimed slots, drops unmatched deals and lists the newest first", async () => {
    const all = [
      listing({ id: "a", slots: [{ dealId: 1, buyerAccount: "x" }, { dealId: 2, buyerAccount: null }] }),
      listing({ id: "b", slots: [{ dealId: 3, buyerAccount: "y" }, { dealId: 4, buyerAccount: "z" }] }),
    ];
    vi.stubGlobal("fetch", async () => Response.json(all));
    const deals: Record<number, Deal> = {
      1: deal("Funded", { id: 1, matched_at_ns: 5 }),
      3: deal("Released", { id: 3, matched_at_ns: 9 }),
      4: deal("NoDeal", { id: 4, matched_at_ns: null }),
    };
    const getDeal = vi.fn(async (id: number) => deals[id] ?? null);
    const signer: Signer = { accountId: "s.testnet", signRequest: async () => ({}), call: async () => 0, send: async () => "" };

    const orders = await loadOrders("http://relayer.test", signer, { getDeal } as unknown as ContractClient);

    expect(orders.map((o) => o.dealId)).toEqual([3, 1]);
    expect(getDeal).toHaveBeenCalledTimes(3);
  });
});
