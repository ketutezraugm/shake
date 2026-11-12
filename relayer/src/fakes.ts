import { randomUUID } from "node:crypto";
import type { ChainDeal, NearReader } from "./near.js";
import { HttpError } from "./errors.js";
import type { NewProfile, ProfileFields, SlotRow, Store } from "./store.js";
import type { Message, Profile, Question } from "./types.js";
import type { Listing, Negotiation } from "./types.js";

// In-memory stand-ins for the tests; claim() mirrors the claim_slot SQL function.
type Slot = { listingId: string; dealId: number; linkToken: string; buyer: string | null };

export class FakeNear implements NearReader {
  readonly deals = new Map<number, ChainDeal>();
  readonly keys = new Set<string>();

  async getDeal(dealId: number) {
    return this.deals.get(dealId) ?? null;
  }

  async hasAccessKey(accountId: string, publicKey: string) {
    return this.keys.has(`${accountId}|${publicKey}`);
  }
}

export class FakeStore implements Store {
  readonly listings: Listing[] = [];
  readonly slots: Slot[] = [];
  readonly profiles: NewProfile[] = [];
  readonly reservedDeals = new Map<string, number>();
  readonly details = new Map<string, ProfileFields>();
  readonly questions: Question[] = [];
  readonly messages: Message[] = [];

  private free(id: string) {
    return this.slots.filter((slot) => slot.listingId === id && slot.buyer === null).length;
  }

  private view(listing: Listing): Listing {
    return { ...listing, freeSlots: this.free(listing.id) };
  }

  async list({ q, category, limit }: Parameters<Store["list"]>[0]) {
    return this.listings
      .filter((l) => l.status === "open" && (!category || l.category === category))
      .filter((l) => !q || `${l.title} ${l.description}`.toLowerCase().includes(q.toLowerCase()))
      .slice(0, limit)
      .map((l) => this.view(l));
  }

  async get(id: string) {
    const listing = this.listings.find((l) => l.id === id);
    return listing ? this.view(listing) : null;
  }

  async listBySeller(seller: string) {
    return this.listings.filter((l) => l.sellerAccount === seller).map((l) => this.view(l));
  }

  async create(seller: string, req: Parameters<Store["create"]>[1]) {
    const listing: Listing = {
      id: randomUUID(),
      sellerAccount: seller,
      ...req,
      photoUrls: [],
      status: "open",
      createdAt: new Date().toISOString(),
      freeSlots: 0,
    };
    this.listings.push(listing);
    return listing;
  }

  async addPhoto(id: string, contentType: string) {
    const photoUrl = `https://photos.test/${id}/${this.listings.length}.${contentType.split("/")[1]}`;
    this.listings.find((l) => l.id === id)?.photoUrls.push(photoUrl);
    return { uploadUrl: `${photoUrl}?upload`, photoUrl };
  }

  async addSlots(id: string, slots: { dealId: number; linkToken: string }[]) {
    this.slots.push(...slots.map((s) => ({ listingId: id, dealId: s.dealId, linkToken: s.linkToken, buyer: null })));
  }

  async slotsOf(id: string): Promise<SlotRow[]> {
    return this.slots.filter((s) => s.listingId === id).map((s) => ({ dealId: s.dealId, buyerAccount: s.buyer }));
  }

  async claim(id: string, buyer: string) {
    const slot = this.slots.find((s) => s.listingId === id && s.buyer === buyer) ?? this.slots.find((s) => s.listingId === id && s.buyer === null);
    if (!slot) return null;
    slot.buyer = buyer;
    return { dealId: slot.dealId, linkToken: slot.linkToken };
  }

  async accountOfUser(supabaseUserId: string) {
    const profile = this.profiles.find((p) => p.supabaseUserId === supabaseUserId);
    return profile ? { accountId: profile.accountId, handle: profile.handle } : null;
  }

  async handleTaken(handle: string) {
    return this.profiles.some((p) => p.handle === handle);
  }

  async createProfile(profile: NewProfile) {
    if (await this.handleTaken(profile.handle)) throw new HttpError(409, "handle or login already has an account");
    this.profiles.push(profile);
  }

  private profileView(profile: NewProfile): Profile {
    const fields = this.details.get(profile.accountId) ?? { displayName: "", bio: "", city: "", avatarUrl: null };
    return { handle: profile.handle, ...fields };
  }

  async profileByHandle(handle: string) {
    const profile = this.profiles.find((p) => p.handle === handle);
    return profile ? { ...this.profileView(profile), accountId: profile.accountId } : null;
  }

  async profileOf(accountId: string) {
    const profile = this.profiles.find((p) => p.accountId === accountId);
    return profile ? this.profileView(profile) : null;
  }

  async saveProfile(accountId: string, fields: ProfileFields, create?: { handle: string }) {
    if (create) await this.createProfile({ accountId, handle: create.handle, auth: "wallet", supabaseUserId: null });
    this.details.set(accountId, fields);
    return this.profileView(this.profiles.find((p) => p.accountId === accountId) as NewProfile);
  }

  async addQuestion(listingId: string, _asker: string, question: string) {
    const row: Question = {
      id: this.questions.length + 1,
      listingId,
      question,
      answer: null,
      answeredAt: null,
      createdAt: new Date().toISOString(),
    };
    this.questions.push(row);
    return row;
  }

  async answeredQuestions(listingId: string) {
    return this.questions.filter((q) => q.listingId === listingId && q.answer !== null);
  }

  async question(id: number) {
    return this.questions.find((q) => q.id === id) ?? null;
  }

  async answerQuestion(id: number, answer: string) {
    const row = this.questions.find((q) => q.id === id);
    if (!row || row.answer !== null) return null;
    row.answer = answer;
    row.answeredAt = new Date().toISOString();
    return row;
  }

  async unansweredFor(seller: string) {
    return this.questions
      .filter((q) => q.answer === null)
      .flatMap((q) => {
        const listing = this.listings.find((l) => l.id === q.listingId);
        return listing?.sellerAccount === seller ? [{ ...q, listingTitle: listing.title }] : [];
      });
  }

  async addMessage(dealId: number, sender: string, body: string) {
    const row: Message = { id: this.messages.length + 1, dealId, senderAccount: sender, body, createdAt: new Date().toISOString() };
    this.messages.push(row);
    return row;
  }

  async messagesOf(dealId: number, after: number) {
    return this.messages.filter((m) => m.dealId === dealId && m.id > after);
  }

  async messagesIn(dealIds: number[], after: number, notFrom: string) {
    return this.messages.filter((m) => dealIds.includes(m.dealId) && m.id > after && m.senderAccount !== notFrom);
  }

  async negotiationsOf(buyer: string): Promise<Negotiation[]> {
    return this.slots
      .filter((s) => s.buyer === buyer)
      .map((s) => {
        const listing = this.listings.find((l) => l.id === s.listingId) as Listing;
        return { listingId: listing.id, title: listing.title, sellerAccount: listing.sellerAccount, dealId: s.dealId, linkToken: s.linkToken };
      });
  }

  async setStatus(id: string, status: Listing["status"], reservedDeal: number | null = null) {
    const listing = this.listings.find((l) => l.id === id);
    if (listing) listing.status = status;
    if (reservedDeal === null) this.reservedDeals.delete(id);
    else this.reservedDeals.set(id, reservedDeal);
  }

  async reservedDealOf(id: string) {
    return this.reservedDeals.get(id) ?? null;
  }
}
