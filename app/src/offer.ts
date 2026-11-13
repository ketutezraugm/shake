import type { ClaimRes } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { sealLimit } from "./crypto";
import { formatRp, isRupiah } from "./format";
import { rememberSealed } from "./proof";
import { signedPost } from "./relayer";
import type { Signer } from "./signer";

/** What the buyer's screen shows for a claimed deal; derived from the chain, never stored. */
export type OfferView =
  | { kind: "enter"; round: number; rounds: number }
  | { kind: "waitingSeller"; round: number; rounds: number }
  | { kind: "computing" }
  | { kind: "retry"; round: number; rounds: number }
  | { kind: "noDeal" }
  | { kind: "expired" }
  | { kind: "matched"; price: string }
  | { kind: "beaten" }
  | { kind: "funded"; price: string; deadlineNs: number | null }
  | { kind: "refundable"; price: string }
  | { kind: "released"; price: string }
  | { kind: "refunded" }
  | { kind: "notYours" };

/** `reservedDealId` is the deal holding the listing's reservation, as the relayer returns it on the listing. */
export type Reservation = { reservedDealId: number | null };

/** `nowNs` is the wall clock in nanoseconds, like the contract's `deadline_ns`; a test passes its own. */
export function offerView(deal: Deal, account: string, reservation: Reservation | null, nowNs = Date.now() * 1e6): OfferView {
  if (deal.buyer !== null && deal.buyer !== account) return { kind: "notYours" };
  const price = deal.price ?? "0";
  const round = { round: deal.round, rounds: deal.max_rounds };

  switch (deal.state) {
    case "Created":
    case "Waiting":
    case "Retry":
      if (deal.buyer_cts.length >= deal.round) return { kind: "waitingSeller", ...round };
      return { kind: deal.state === "Retry" ? "retry" : "enter", ...round };
    case "Computing":
      return { kind: "computing" };
    case "Matched": {
      const holder = reservation?.reservedDealId ?? null;
      return holder !== null && holder !== deal.id ? { kind: "beaten" } : { kind: "matched", price };
    }
    case "Funded":
      // The contract refunds only strictly after the deadline, so the button appears at the same moment.
      if (deal.deadline_ns !== null && nowNs > deal.deadline_ns) return { kind: "refundable", price };
      return { kind: "funded", price, deadlineNs: deal.deadline_ns };
    case "Released":
      return { kind: "released", price };
    case "Refunded":
      return { kind: "refunded" };
    case "NoDeal":
      return { kind: deal.matched_at_ns !== null ? "expired" : "noDeal" };
  }
}

/** The claimed deal and its token stay in this browser so the buyer can come back to it. */
export type Negotiation = { listingId: string; title: string; askingPrice: string; linkToken: string };

const negotiationKey = (dealId: number) => `blind-deal:negotiation:${dealId}`;
const offerKey = (dealId: number) => `blind-deal:offer:${dealId}`;

export function saveNegotiation(dealId: number, negotiation: Negotiation): void {
  localStorage.setItem(negotiationKey(dealId), JSON.stringify(negotiation));
}

export function loadNegotiation(dealId: number): Negotiation | null {
  const saved = localStorage.getItem(negotiationKey(dealId));
  return saved ? (JSON.parse(saved) as Negotiation) : null;
}

/** The buyer's last offer; only this browser knows it, and it is the floor for any later round. */
export function lastOffer(dealId: number): string | null {
  return localStorage.getItem(offerKey(dealId));
}

export async function claimSlot(
  relayerUrl: string,
  signer: Signer,
  listing: { id: string; title: string; askingPrice: string },
): Promise<ClaimRes> {
  const claim = await signedPost<ClaimRes>(relayerUrl, signer, `/listings/${listing.id}/claim`, {}, "Starting your offer");
  saveNegotiation(claim.dealId, { listingId: listing.id, title: listing.title, askingPrice: listing.askingPrice, linkToken: claim.linkToken });
  return claim;
}

export type SubmitOfferInput = {
  deal: Deal;
  /** Whole Rupiah as digits. */
  limit: string;
  askingPrice: string;
  linkToken: string;
  client: ContractClient;
  teePubkey: string;
};

/** Seals the buyer's maximum for this round and submits it; refuses what the TEE or contract would turn into a lost round. */
export async function submitOffer({ deal, limit, askingPrice, linkToken, client, teePubkey }: SubmitOfferInput): Promise<void> {
  if (!isRupiah(limit)) throw new Error("Enter your offer as whole Rupiah, digits only");
  if (BigInt(limit) > BigInt(askingPrice)) {
    throw new Error(`That's above the asking price. The most you can offer is ${formatRp(askingPrice)}.`);
  }
  const previous = deal.round > 1 ? lastOffer(deal.id) : null;
  if (previous !== null && BigInt(limit) < BigInt(previous)) {
    throw new Error(`You can only raise your offer. Your last offer was ${formatRp(previous)}.`);
  }

  const sealed = await sealLimit(deal.id, "buyer", deal.round, limit, teePubkey);
  // The contract wants the raw link token on the buyer's first submit and nothing after it.
  await client.submitLimit(deal.id, sealed.ct, sealed.commit, deal.buyer === null ? linkToken : null);
  localStorage.setItem(offerKey(deal.id), limit);
  rememberSealed(deal.id, deal.round, limit, sealed.salt);
}

/** Asks the relayer to re-read the listing's deals so browse shows it reserved, sold or open again. */
export async function syncListing(relayerUrl: string, listingId: string): Promise<void> {
  const response = await fetch(`${relayerUrl}/listings/${listingId}/sync`, { method: "POST" }).catch(() => {
    throw new Error("Updating the listing failed: could not reach the relayer");
  });
  if (!response.ok) throw new Error(`Updating the listing failed: relayer answered ${response.status}`);
}
