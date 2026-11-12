import type {
  Category,
  ClaimRes,
  CreateListingReq,
  Listing,
  ListingStatus,
  Negotiation,
  PhotoRes,
  PhotoType,
  SlotInput,
} from "./types.js";

export type ListFilter = { q?: string; category?: Category; before?: string; limit: number };
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
  slotsOf(id: string): Promise<SlotRow[]>;
  /** The buyer's existing slot, a newly claimed one, or null when the listing is full. */
  claim(id: string, buyer: string): Promise<ClaimRes | null>;
  negotiationsOf(buyer: string): Promise<Negotiation[]>;
  setStatus(id: string, status: ListingStatus): Promise<void>;
}
