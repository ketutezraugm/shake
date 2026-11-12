import type { Category, Listing, ListingStatus } from "../../relayer/src/types";

// Until MK-12 and MK-15 land these in relayer/src/types.ts: `reserved` status, `askingPrice` and the public shop shape.
export type ShopListing = Omit<Listing, "status"> & { status: ListingStatus | "reserved"; askingPrice: string };
export type Profile = { handle: string; displayName: string; avatarUrl: string | null; bio: string; city: string };
/** `GET /profiles/:handle` as proposed to Harfi: open and reserved listings, newest first, plus the sold count. */
export type Shop = { profile: Profile; listings: ShopListing[]; soldCount: number };
export type BrowsePage = { listings: ShopListing[]; nextCursor: string | null };
export type BrowseQuery = { q?: string; category?: Category; cursor?: string };

export interface Market {
  browse(query: BrowseQuery): Promise<BrowsePage>;
  profile(handle: string): Promise<Shop | null>;
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
  };
}

const newestFirst = (a: ShopListing, b: ShopListing) => b.createdAt.localeCompare(a.createdAt);

/** Same filtering and paging as the relayer's store, for building screens before it is deployed. */
export function mockMarket(listings: ShopListing[], profiles: Profile[]): Market {
  return {
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
