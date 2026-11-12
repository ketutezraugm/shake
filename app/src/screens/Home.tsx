import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES, type Category } from "../../../relayer/src/types";
import type { ShopListing } from "../market";
import { market } from "../marketSource";
import { ListingCard } from "./ListingCard";

const CATEGORY_LABELS: Record<Category, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  home: "Home",
  vehicles: "Vehicles",
  hobbies: "Hobbies",
  other: "Other",
};

export function Home() {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [listings, setListings] = useState<ShopListing[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // Drop answers to an older search that arrive after a newer one.
    let current = true;
    setListings(null);
    setError(null);
    market
      .browse({ q: q || undefined, category: category || undefined })
      .then((page) => {
        if (!current) return;
        setListings(page.listings);
        setCursor(page.nextCursor);
      })
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [q, category]);

  function search(event: FormEvent) {
    event.preventDefault();
    setQ(draft.trim());
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await market.browse({ q: q || undefined, category: category || undefined, cursor });
      setListings((shown) => [...(shown ?? []), ...page.listings]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="screen">
      <h1 className="headline">Blind deal</h1>

      <form role="search" onSubmit={search}>
        <label>
          Search
          <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </label>
        <button>Search</button>
      </form>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {listings === null && !error && <p className="muted">Loading…</p>}
      {listings?.length === 0 && <p className="muted">Nothing found.</p>}
      {listings && listings.length > 0 && (
        <ul>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
      {cursor && (
        <button disabled={loadingMore} onClick={() => void loadMore()}>
          Show more
        </button>
      )}
    </main>
  );
}
