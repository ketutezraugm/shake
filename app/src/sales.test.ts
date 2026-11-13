import { describe, expect, it, vi } from "vitest";
import type { SellerListing } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { loadSales, salesRow } from "./sales";
import type { Signer } from "./signer";

const listing = (overrides: Partial<SellerListing> = {}): SellerListing =>
  ({ id: "l1", title: "Camera", status: "open", freeSlots: 3, reservedDealId: null, slots: [], ...overrides }) as SellerListing;
const deal = (state: Deal["state"]) => ({ id: 5, state }) as Deal;

describe("salesRow", () => {
  it("shows an open listing with its free slots and the offers in progress", () => {
    const slots = [{ dealId: 1, buyerAccount: "a.testnet" }, { dealId: 2, buyerAccount: null }];
    expect(salesRow(listing({ freeSlots: 1, slots }), null)).toMatchObject({ state: "Open, 1 offer slot free", detail: "1 offer in progress", finished: false });
    expect(salesRow(listing({ freeSlots: 3 }), null)).toMatchObject({ state: "Open, 3 offer slots free", detail: null });
  });

  it("says offers are full when no slot is free", () => {
    expect(salesRow(listing({ freeSlots: 0 }), null).state).toBe("Offers full");
  });

  it("tells a reserved listing's two waiting stages apart", () => {
    const reserved = listing({ status: "reserved", reservedDealId: 5 });
    expect(salesRow(reserved, deal("Matched"))).toMatchObject({ state: "Reserved", detail: "Waiting for the buyer to pay" });
    expect(salesRow(reserved, deal("Funded"))).toMatchObject({ state: "Paid, held in escrow", detail: "Waiting for the buyer to tap Received" });
  });

  it("marks sold and closed listings finished", () => {
    expect(salesRow(listing({ status: "sold" }), null)).toMatchObject({ state: "Sold, paid out", finished: true });
    expect(salesRow(listing({ status: "closed" }), null)).toMatchObject({ state: "Closed", finished: true });
  });
});

describe("loadSales", () => {
  it("reads the reserving deal only for reserved listings and lists live ones first", async () => {
    const all = [listing({ id: "a", status: "sold" }), listing({ id: "b", status: "reserved", reservedDealId: 5 }), listing({ id: "c" })];
    vi.stubGlobal("fetch", async () => Response.json(all));
    const getDeal = vi.fn(async () => deal("Funded"));
    const signer: Signer = { accountId: "s.testnet", signRequest: async () => ({}), call: async () => 0, send: async () => "" };

    const rows = await loadSales("http://relayer.test", signer, { getDeal } as unknown as ContractClient);

    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(getDeal).toHaveBeenCalledTimes(1);
  });
});
