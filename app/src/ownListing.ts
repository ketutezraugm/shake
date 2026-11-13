import type { SellerListing } from "../../relayer/src/types";
import type { ContractClient, Deal } from "./contract";
import { syncListing } from "./offer";
import { signedGet, signedPost } from "./relayer";
import type { Signer } from "./signer";

// The relayer refuses more than this many slots per listing (MAX_SLOTS in relayer/src/validate.ts).
export const MAX_SLOTS = 10;
// Each deal takes 4-6 s on testnet, so a tap adds a batch of 3: about the wait of publishing, not a minute of it.
export const SLOTS_PER_TAP = 3;

/** How many slots "Add offer slots" makes next: a full batch, or the few left up to the limit; 0 when at the limit. */
export function slotsToAdd(total: number): number {
  return Math.max(0, Math.min(SLOTS_PER_TAP, MAX_SLOTS - total));
}

/** The caller's own listing with its slots; the buyer-facing listing does not say how many slots exist in all. */
export async function myListing(relayerUrl: string, signer: Signer, listingId: string): Promise<SellerListing | undefined> {
  const listings = await signedGet<SellerListing[]>(relayerUrl, signer, "/me/listings", "loading your listing");
  return listings.find((listing) => listing.id === listingId);
}

// How long a matched buyer has to pay before anyone may expire the deal (FUNDING_WINDOW_NS in contract/src/lib.rs).
export const FUNDING_WINDOW_NS = 24 * 60 * 60 * 1e9;

/** True for a matched deal whose buyer never paid in time. `nowNs` is the wall clock in nanoseconds; a test passes its own. */
export function canReopen(deal: Deal | null, nowNs = Date.now() * 1e6): boolean {
  return deal?.state === "Matched" && deal.matched_at_ns !== null && nowNs > deal.matched_at_ns + FUNDING_WINDOW_NS;
}

/** Ends the unpaid deal on chain, then asks the relayer to re-read it, which reopens the listing. */
export async function reopenListing(client: Pick<ContractClient, "expire">, relayerUrl: string, listingId: string, dealId: number): Promise<void> {
  await client.expire(dealId);
  await syncListing(relayerUrl, listingId);
}

export function closeListing(relayerUrl: string, signer: Signer, listingId: string): Promise<unknown> {
  return signedPost(relayerUrl, signer, `/listings/${listingId}/close`, {}, "closing the listing");
}
