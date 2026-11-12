import type { Category, Listing, Question } from "../../relayer/src/types";

export type ShopListing = Listing;
export type Profile = { handle: string; displayName: string; avatarUrl: string | null; bio: string; city: string };
/** `GET /profiles/:handle` as proposed to Harfi: open and reserved listings, newest first, plus the sold count. */
export type Shop = { profile: Profile; listings: ShopListing[]; soldCount: number };
export type BrowsePage = { listings: ShopListing[]; nextCursor: string | null };
export type BrowseQuery = { q?: string; category?: Category; cursor?: string };

export interface Market {
  browse(query: BrowseQuery): Promise<BrowsePage>;
  profile(handle: string): Promise<Shop | null>;
  /** One listing in any status, or null when unknown. */
  listing(id: string): Promise<ShopListing | null>;
  /** The listing's answered questions: public, readable signed out. */
  questions(listingId: string): Promise<Question[]>;
}

const PAGE_SIZE = 20;

export function httpMarket(baseUrl: string): Market {
  async function get<T>(path: string): Promise<T | null> {
    const response = await fetch(`${baseUrl}${path}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `relayer answered ${response.status}`);
    }
    return (await response.json()) as T;
  }

  return {
    async browse({ q, category, cursor }) {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (cursor) params.set("cursor", cursor);
      const query = params.toString();
      const page = await get<BrowsePage>(`/listings${query ? `?${query}` : ""}`);
      if (!page) throw new Error("listings endpoint not found");
      return page;
    },
    profile: (handle) => get<Shop>(`/profiles/${encodeURIComponent(handle)}`),
    listing: (id) => get<ShopListing>(`/listings/${encodeURIComponent(id)}`),
    async questions(listingId) {
      return (await get<Question[]>(`/listings/${encodeURIComponent(listingId)}/questions`)) ?? [];
    },
  };
}

const newestFirst = (a: ShopListing, b: ShopListing) => b.createdAt.localeCompare(a.createdAt);

/** Same filtering and paging as the relayer's store, for building screens before it is deployed. */
export function mockMarket(listings: ShopListing[], profiles: Profile[], questions: Question[] = []): Market {
  return {
    async listing(id) {
      return listings.find((l) => l.id === id) ?? null;
    },

    async questions(listingId) {
      return questions.filter((q) => q.listingId === listingId && q.answer !== null);
    },

    async browse({ q, category, cursor }) {
      const needle = q?.toLowerCase();
      const matches = listings
        .filter((l) => l.status === "open" && (!category || l.category === category))
        .filter((l) => !needle || `${l.title} ${l.description}`.toLowerCase().includes(needle))
        .filter((l) => !cursor || l.createdAt < cursor)
        .sort(newestFirst)
        .slice(0, PAGE_SIZE);
      return { listings: matches, nextCursor: matches.length === PAGE_SIZE ? matches.at(-1)!.createdAt : null };
    },

    async profile(handle) {
      const profile = profiles.find((p) => p.handle === handle);
      if (!profile) return null;
      const own = listings.filter((l) => l.sellerAccount.split(".")[0] === handle);
      return {
        profile,
        listings: own.filter((l) => l.status === "open" || l.status === "reserved").sort(newestFirst),
        soldCount: own.filter((l) => l.status === "sold").length,
      };
    },
  };
}
