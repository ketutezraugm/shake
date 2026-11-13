import type { Negotiation } from "../../relayer/src/types";
import type { ContractClient } from "./contract";
import { formatRp, rpFromYocto } from "./format";
import { market } from "./marketSource";
import { offerView, type OfferView } from "./offer";
import { signedGet } from "./relayer";
import type { Signer } from "./signer";

export type OfferRow = { dealId: number; listingId: string; title: string; view: OfferView };

/** What a row says about its deal: a state, the next step (null when there is none) and whether it waits on the buyer. */
export type RowText = { state: string; action: string | null; yourMove: boolean };

export function rowText(view: OfferView): RowText {
  switch (view.kind) {
    case "enter":
      return { state: `Round ${view.round} of ${view.rounds}`, action: "Make your offer", yourMove: true };
    case "retry":
      return { state: "No deal this round", action: "Raise your offer", yourMove: true };
    case "waitingSeller":
      return { state: "Waiting for the seller", action: null, yourMove: false };
    case "computing":
      return { state: "Comparing in the sealed machine", action: null, yourMove: false };
    case "matched":
      return { state: "It's a deal", action: `Pay ${formatRp(rpFromYocto(view.price))}`, yourMove: true };
    case "funded":
      return { state: "Paid, held in escrow", action: "Tap Received when it arrives", yourMove: false };
    case "refundable":
      return { state: "Delivery deadline passed", action: "Get my money back", yourMove: true };
    case "beaten":
      return { state: "Another buyer got there first", action: null, yourMove: false };
    case "noDeal":
      return { state: "No deal", action: null, yourMove: false };
    case "expired":
      return { state: "Not paid in time", action: null, yourMove: false };
    case "released":
    case "refunded":
    case "notYours":
      return { state: "", action: null, yourMove: false };
  }
}

// Finished purchases and their receipts live on /history, so a deal that has paid out or come back is not "in progress".
const FINISHED: OfferView["kind"][] = ["released", "refunded", "notYours"];

/** Rows that wait on the buyer come first, then the rest in the order the relayer returned them. */
export function sortRows(rows: OfferRow[]): OfferRow[] {
  return [...rows].sort((a, b) => Number(rowText(b.view).yourMove) - Number(rowText(a.view).yourMove));
}

/** The buyer's deals still in progress, each turned into the same view the offer screen shows. */
export async function loadMyOffers(relayerUrl: string, signer: Signer, client: ContractClient, account: string): Promise<OfferRow[]> {
  const negotiations = await signedGet<Negotiation[]>(relayerUrl, signer, "/me/negotiations", "Reading your offers");
  const rows = await Promise.all(
    negotiations.map(async (negotiation): Promise<OfferRow | null> => {
      const deal = await client.getDeal(negotiation.dealId);
      if (!deal) return null;
      // Only a matched deal needs the listing, to tell whether another buyer holds the reservation.
      const listing = deal.state === "Matched" ? await market.listing(negotiation.listingId) : null;
      const view = offerView(deal, account, listing && { reservedDealId: listing.reservedDealId });
      return FINISHED.includes(view.kind) ? null : { dealId: deal.id, listingId: negotiation.listingId, title: negotiation.title, view };
    }),
  );
  return sortRows(rows.filter((row): row is OfferRow => row !== null));
}
