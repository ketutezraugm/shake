import type { SellerListing } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { signedGet } from "./relayer";
import type { Signer } from "./signer";

export type SalesRow = { id: string; title: string; state: string; detail: string | null; finished: boolean };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** A listing's state for the seller. `reserving` is the deal that holds a reserved listing, read from the chain. */
export function salesRow(listing: SellerListing, reserving: Deal | null): SalesRow {
  const { id, title } = listing;
  switch (listing.status) {
    case "sold":
      return { id, title, state: "Sold, paid out", detail: null, finished: true };
    case "closed":
      return { id, title, state: "Closed", detail: null, finished: true };
    case "reserved":
      return { id, title, ...reservedText(reserving), finished: false };
    case "open": {
      const inProgress = listing.slots.filter((slot) => slot.buyerAccount !== null).length;
      const detail = inProgress > 0 ? plural(inProgress, "offer in progress", "offers in progress") : null;
      return listing.freeSlots > 0
        ? { id, title, state: `Open, ${plural(listing.freeSlots, "offer slot", "offer slots")} free`, detail, finished: false }
        : { id, title, state: "Offers full", detail, finished: false };
    }
  }
}

function reservedText(deal: Deal | null): Pick<SalesRow, "state" | "detail"> {
  if (deal?.state === "Funded") return { state: "Paid, held in escrow", detail: "Waiting for the buyer to tap Received" };
  if (deal?.state === "Released") return { state: "Paid out", detail: null };
  return { state: "Reserved", detail: "Waiting for the buyer to pay" };
}

// Open and reserved first, since those can still change; finished ones follow in the order the relayer returned them.
export const sortSales = (rows: SalesRow[]): SalesRow[] => [...rows].sort((a, b) => Number(a.finished) - Number(b.finished));

/** Every listing the signed-in seller made, each with its state. */
export async function loadSales(relayerUrl: string, signer: Signer, client: ContractClient): Promise<SalesRow[]> {
  const listings = await signedGet<SellerListing[]>(relayerUrl, signer, "/me/listings", "Reading your sales");
  const rows = await Promise.all(
    listings.map(async (listing) => {
      const reserving = listing.status === "reserved" && listing.reservedDealId !== null ? await client.getDeal(listing.reservedDealId) : null;
      return salesRow(listing, reserving);
    }),
  );
  return sortSales(rows);
}
