import type {
  Category,
  ClaimRes,
  CreateListingReq,
  Listing,
  ListingStatus,
  Negotiation,
  PhotoRes,
  Message,
  PhotoType,
  Profile,
  Question,
  Receipt,
  SlotInput,
  UpdateProfileReq,
} from "./types.js";

export type ListFilter = { q?: string; category?: Category; before?: string; limit: number };
export type NewProfile = { accountId: string; handle: string; auth: "email" | "wallet"; supabaseUserId: string | null };
export type ProfileFields = Omit<UpdateProfileReq, "handle">;
export type SlotRow = { dealId: number; buyerAccount: string | null };

/** Everything the routes need from the database; the only implementation talks to Supabase. */
export interface Store {
  list(filter: ListFilter): Promise<Listing[]>;
  get(id: string): Promise<Listing | null>;
  listBySeller(seller: string): Promise<Listing[]>;
  create(seller: string, req: CreateListingReq): Promise<Listing>;
  /** Records a new photo path on the listing and returns where to upload it. */
  addPhoto(id: string, contentType: PhotoType): Promise<PhotoRes>;
  addSlots(id: string, slots: SlotInput[]): Promise<void>;
  /** Deletes the listing with its slots, questions and photos. */
  remove(id: string): Promise<void>;
  slotsOf(id: string): Promise<SlotRow[]>;
  /** The buyer's existing slot, a newly claimed one, or null when the listing is full. */
  claim(id: string, buyer: string): Promise<ClaimRes | null>;
  /** Takes a slot out of circulation because its deal was cancelled; a marker unique per slot keeps (listing, buyer) unique. */
  retireSlot(dealId: number): Promise<void>;
  hasProfileForUser(supabaseUserId: string): Promise<boolean>;
  handleTaken(handle: string): Promise<boolean>;
  /** Throws a 409 HttpError when the handle or the user already has a profile. */
  createProfile(profile: NewProfile): Promise<void>;
  profileByHandle(handle: string): Promise<(Profile & { accountId: string }) | null>;
  profileOf(accountId: string): Promise<Profile | null>;
  /** Updates the caller's profile, or inserts a wallet profile when `create` carries a handle. Throws 409 on a taken handle. */
  saveProfile(accountId: string, fields: ProfileFields, create?: { handle: string }): Promise<Profile>;
  addQuestion(listingId: string, asker: string, question: string): Promise<Question>;
  /** Answered questions only, oldest first: these are the public ones. */
  answeredQuestions(listingId: string): Promise<Question[]>;
  question(id: number): Promise<Question | null>;
  /** Null when the question already has an answer. */
  answerQuestion(id: number, answer: string): Promise<Question | null>;
  unansweredFor(seller: string): Promise<(Question & { listingTitle: string })[]>;
  addMessage(dealId: number, sender: string, body: string): Promise<Message>;
  messagesOf(dealId: number, after: number): Promise<Message[]>;
  /** Messages in these deals with an id above `after`, written by anyone but `notFrom`. */
  messagesIn(dealIds: number[], after: number, notFrom: string): Promise<Message[]>;
  negotiationsOf(buyer: string): Promise<Negotiation[]>;
  /** `reservedDeal` is the deal holding a reservation, and null otherwise. */
  setStatus(id: string, status: ListingStatus, reservedDeal?: number | null): Promise<void>;
  reservedDealOf(id: string): Promise<number | null>;
  /** Keeps the first receipt for a deal and kind, so a repeat returns the stored one. */
  addReceipt(receipt: Receipt): Promise<Receipt>;
  receiptsOf(dealIds: number[]): Promise<Receipt[]>;
}
