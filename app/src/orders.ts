import type { SellerListing } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { rpDigitsFromYocto } from "./format";
import { signedGet } from "./relayer";
import type { Signer } from "./signer";

export const ORDER_TABS = [
  { key: "all", label: "All orders" },
  { key: "new", label: "New orders" },
  { key: "done", label: "Order done" },
  { key: "cancelled", label: "Cancelled orders" },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["key"];

export type Order = {
  listingId: string;
  dealId: number;
  title: string;
  photoUrl: string | null;
  buyer: string;
  /** Whole Rupiah digits: what the listing asked, and what the blind offers settled on. */
  askingRp: string;
  dealRp: string;
  /** How far below the asking price the deal landed, rounded; 0 when it closed at the asking price. */
  belowAskingPct: number;
  state: string;
  detail: string | null;
  tab: Exclude<OrderTab, "all">;
  matchedAt: number;
};

export function tabOf(search: string): OrderTab {
  const asked = new URLSearchParams(search).get("status");
  return ORDER_TABS.find((t) => t.key === asked)?.key ?? "all";
}

export const inTab = (orders: Order[], tab: OrderTab): Order[] => (tab === "all" ? orders : orders.filter((o) => o.tab === tab));

type Outcome = Pick<Order, "state" | "detail" | "tab">;

function outcome(deal: Deal): Outcome | null {
  switch (deal.state) {
    case "Matched":
      return { state: "Waiting for payment", detail: "The buyer has 24 hours to pay", tab: "new" };
    case "Funded":
      return { state: "Paid, hand it over", detail: "Money is held until the buyer taps Received", tab: "new" };
    case "Released":
      return { state: "Paid out", detail: null, tab: "done" };
    case "Refunded":
      return { state: "Refunded to the buyer", detail: null, tab: "cancelled" };
    // An unmatched NoDeal is a failed negotiation, not an order; one with a match time expired unpaid.
    case "NoDeal":
      return deal.matched_at_ns === null ? null : { state: "Buyer did not pay in time", detail: null, tab: "cancelled" };
    default:
      return null;
  }
}

function belowAsking(askingRp: string, dealRp: string): number {
  const asking = Number(askingRp);
  return asking > 0 ? Math.max(0, Math.round(((asking - Number(dealRp)) / asking) * 100)) : 0;
}

/** One order for a deal that found a price, or null while the offers are still negotiating or never matched. */
export function orderFromDeal(listing: SellerListing, deal: Deal): Order | null {
  const result = outcome(deal);
  if (!result || deal.buyer === null || deal.price === null || deal.matched_at_ns === null) return null;
  const dealRp = rpDigitsFromYocto(deal.price);
  return {
    listingId: listing.id,
    dealId: deal.id,
    title: listing.title,
    photoUrl: listing.photoUrls[0] ?? null,
    buyer: deal.buyer,
    askingRp: listing.askingPrice,
    dealRp,
    belowAskingPct: belowAsking(listing.askingPrice, dealRp),
    matchedAt: deal.matched_at_ns,
    ...result,
  };
}

/** Every matched deal on the signed-in seller's listings, newest first. Expired ones exist only on the chain, so each claimed slot is read there. */
export async function loadOrders(relayerUrl: string, signer: Signer, client: ContractClient): Promise<Order[]> {
  const listings = await signedGet<SellerListing[]>(relayerUrl, signer, "/me/listings", "Reading your orders");
  const found = await Promise.all(
    listings.flatMap((listing) =>
      listing.slots
        .filter((slot) => slot.buyerAccount !== null)
        .map(async (slot) => {
          const deal = await client.getDeal(slot.dealId);
          return deal ? orderFromDeal(listing, deal) : null;
        }),
    ),
  );
  return found.filter((o): o is Order => o !== null).sort((a, b) => b.matchedAt - a.matchedAt);
}
