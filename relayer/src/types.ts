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

/** Public seller fields; the Supabase user id and the sign-in method never leave the relayer. */
export type Profile = { handle: string; displayName: string; avatarUrl: string | null; bio: string; city: string };

/** What `/@handle` shows: open and reserved listings, newest first, and how many sold. */
export type Shop = { profile: Profile; listings: Listing[]; soldCount: number };

/** `handle` is required only on the first call, when a wallet user creates their profile; it never changes afterwards. */
export type UpdateProfileReq = { handle?: string; displayName: string; bio: string; city: string; avatarUrl: string | null };

export type Question = { id: number; listingId: string; question: string; answer: string | null; answeredAt: string | null; createdAt: string };
export type AskReq = { question: string };
export type AnswerReq = { answer: string };

export type Message = { id: number; dealId: number; senderAccount: string; body: string; createdAt: string };
export type SendMessageReq = { body: string };

/** Everything waiting on the caller. The app keeps the last message id it has seen and passes it as `?after=`. */
export type Inbox = {
  questions: (Question & { listingTitle: string })[];
  /** Slots in `Retry` where the seller must resubmit for the next round. */
  roundsWaiting: { listingId: string; title: string; dealId: number; round: number }[];
  matches: { listingId: string; title: string; dealId: number; role: "seller" | "buyer"; counterparty: string; state: string }[];
  newMessages: Message[];
};

export type ErrorRes = { error: string };
