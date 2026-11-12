// Request and response shapes of the relayer API; the app imports these, so change only by PR.

export const CATEGORIES = ["electronics", "fashion", "home", "vehicles", "hobbies", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type ListingStatus = "open" | "reserved" | "sold" | "closed";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

export type Listing = {
  id: string;
  sellerAccount: string;
  title: string;
  description: string;
  category: Category;
  photoUrls: string[];
  maxRounds: number;
  status: ListingStatus;
  createdAt: string;
  freeSlots: number;
};

export type CreateListingReq = { title: string; description: string; category: Category; maxRounds: number };

/** One pre-created on-chain deal that a single buyer can claim. */
export type SlotInput = { dealId: number; linkToken: string };
export type RegisterSlotsReq = { slots: SlotInput[] };

export type PhotoReq = { contentType: PhotoType };
/** PUT the file bytes to `uploadUrl` with the same Content-Type; `photoUrl` is where it is then served. */
export type PhotoRes = { uploadUrl: string; photoUrl: string };

export type ClaimRes = { dealId: number; linkToken: string };

export type ListingPage = { listings: Listing[]; nextCursor: string | null };

export type SellerListing = Listing & { slots: { dealId: number; buyerAccount: string | null }[] };

export type Negotiation = {
  listingId: string;
  title: string;
  sellerAccount: string;
  dealId: number;
  linkToken: string;
};

/** Sent with a Supabase access token as `Authorization: Bearer`; the relayer creates `handle.<parent>` for the browser's key. */
export type CreateAccountReq = { handle: string; publicKey: string };
export type CreateAccountRes = { accountId: string };

export type ErrorRes = { error: string };
