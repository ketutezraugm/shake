import { describe, expect, it } from "vitest";
import { formatNear, offerTotals } from "./accountSummary";
import type { OfferRow } from "./myOffers";
import type { OfferView } from "./offer";

const PRICE = "150000000000000000000000"; // 0.15 NEAR, Rp 15.000.000 at the demo rate
const row = (view: OfferView, dealId = 1): OfferRow => ({ dealId, listingId: "l", title: "Item", view });

describe("offerTotals", () => {
  it("counts open deals, those waiting on the buyer, and only paid money as locked", () => {
    const totals = offerTotals([
      row({ kind: "funded", price: PRICE, deadlineNs: null }, 1),
      row({ kind: "refundable", price: PRICE }, 2),
      row({ kind: "matched", price: PRICE }, 3), // agreed but not paid: nothing is in escrow yet
      row({ kind: "waitingSeller", round: 1, rounds: 2 }, 4),
    ]);
    expect(totals).toEqual({ open: 4, needYou: 2, lockedRp: "30.000.000" });
  });

  it("is empty with no deals", () => {
    expect(offerTotals([])).toEqual({ open: 0, needYou: 0, lockedRp: "0" });
  });
});

describe("formatNear", () => {
  it("shows two decimals", () => {
    expect(formatNear("1234000000000000000000000")).toBe("1.23 NEAR");
    expect(formatNear("0")).toBe("0.00 NEAR");
  });

  it("does not show a tiny balance as zero", () => {
    expect(formatNear("1000000000000000000000")).toBe("<0.01 NEAR");
  });
});
