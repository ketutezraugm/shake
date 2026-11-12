import { afterEach, describe, expect, it, vi } from "vitest";
import { httpMarket, mockMarket, type ShopListing } from "./market";

function listing(overrides: Partial<ShopListing>): ShopListing {
  return {
    id: "l0",
    sellerAccount: "demo.blind-deal.testnet",
    title: "Item",
    description: "",
    category: "other",
    photoUrls: [],
    maxRounds: 2,
    status: "open",
    createdAt: "2026-11-13T00:00:00.000Z",
    freeSlots: 3,
    ...overrides,
  };
}

const profile = { handle: "demo", displayName: "Demo Shop", avatarUrl: null, bio: "", city: "Jakarta" };

describe("mockMarket", () => {
  const listings = [
    listing({ id: "cam", title: "Kamera Fujifilm X-T20", category: "electronics", createdAt: "2026-11-13T03:00:00.000Z" }),
    listing({ id: "lens", title: "Lensa 35mm", description: "Cocok untuk kamera mirrorless", category: "electronics", createdAt: "2026-11-13T02:00:00.000Z" }),
    listing({ id: "jacket", title: "Denim jacket", category: "fashion", createdAt: "2026-11-13T01:00:00.000Z" }),
    listing({ id: "bike", title: "Sepeda lipat", category: "vehicles", status: "reserved" }),
    listing({ id: "lamp", title: "Lampu meja", category: "home", status: "sold" }),
    listing({ id: "other", title: "Kamera lama", sellerAccount: "someone.blind-deal.testnet", status: "closed" }),
  ];
  const market = mockMarket(listings, [profile]);

  it("browses only open listings, newest first", async () => {
    const page = await market.browse({});
    expect(page.listings.map((l) => l.id)).toEqual(["cam", "lens", "jacket"]);
  });

  it("searches title and description, ignoring case", async () => {
    const page = await market.browse({ q: "KAMERA" });
    expect(page.listings.map((l) => l.id)).toEqual(["cam", "lens"]);
  });

  it("filters by category", async () => {
    const page = await market.browse({ category: "fashion" });
    expect(page.listings.map((l) => l.id)).toEqual(["jacket"]);
  });

  it("pages 20 at a time with the last createdAt as cursor", async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      listing({ id: `n${i}`, createdAt: new Date(Date.UTC(2026, 10, 13, 0, i)).toISOString() }),
    );
    const paged = mockMarket(many, []);

    const first = await paged.browse({});
    const second = await paged.browse({ cursor: first.nextCursor! });

    expect(first.listings).toHaveLength(20);
    expect(second.listings).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
  });

  it("shows a shop with its open and reserved listings and its sold count", async () => {
    const shop = await market.profile("demo");

    expect(shop?.profile.displayName).toBe("Demo Shop");
    expect(shop?.listings.map((l) => [l.id, l.status])).toEqual([
      ["cam", "open"],
      ["lens", "open"],
      ["jacket", "open"],
      ["bike", "reserved"],
    ]);
    expect(shop?.soldCount).toBe(1);
  });

  it("returns null for an unknown shop", async () => {
    expect(await market.profile("nobody")).toBeNull();
  });
});

describe("httpMarket", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the query, category and cursor and returns the page", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return Response.json({ listings: [], nextCursor: null });
    });

    const page = await httpMarket("http://relayer.test").browse({ q: "kamera lama", category: "electronics", cursor: "2026-11-13T00:00:00.000Z" });

    expect(page).toEqual({ listings: [], nextCursor: null });
    expect(urls).toEqual(["http://relayer.test/listings?q=kamera+lama&category=electronics&cursor=2026-11-13T00%3A00%3A00.000Z"]);
  });

  it("maps a 404 profile to null and other errors to the relayer's message", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/profiles/nobody") ? Response.json({ error: "not found" }, { status: 404 }) : Response.json({ error: "slow down" }, { status: 429 }),
    );
    const market = httpMarket("http://relayer.test");

    expect(await market.profile("nobody")).toBeNull();
    await expect(market.browse({})).rejects.toThrow("slow down");
  });
});
