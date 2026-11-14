import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES, type Category } from "../../../relayer/src/types";
import { CATEGORY_LABELS } from "../categories";
import priceTag from "../design/assets/stickers/price-tag.svg";
import type { ShopListing } from "../market";
import { market } from "../marketSource";
import { Link } from "../routes";
import { ListingCard } from "./ListingCard";
import { CardSkeletons, EmptyState, ErrorState } from "./States";

export function Home({ initialQuery = "" }: { initialQuery?: string }) {
  const [draft, setDraft] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<Category | "">("");
  const [listings, setListings] = useState<ShopListing[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
  }, [q, category, attempt]);

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
    <main className="page">
      <form role="search" className="search" onSubmit={search}>
        <label>
          <span className="sr-only">Search listings</span>
          <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search cameras, bikes, jackets…" />
        </label>
      </form>

      <section className="card-hero">
        <div>
          <h1>Post your price, keep your floor.</h1>
          <p>Every item shows its asking price. Offer it or less; the seller never sees your number.</p>
          <Link to="/welcome" className="hero-link">How it works</Link>
        </div>
        <img className="sticker" src={priceTag} alt="" />
      </section>

      <nav aria-label="Categories" className="chips">
        <button className="chip" aria-pressed={category === ""} onClick={() => setCategory("")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </nav>

      <div className="section-head">
        <h2>Fresh listings</h2>
        {listings && <span className="num muted">{listings.length} {listings.length === 1 ? "item" : "items"}</span>}
      </div>

      {error && <ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} />}
      {listings === null && !error && <CardSkeletons />}
      {listings?.length === 0 &&
        (q ? (
          <EmptyState title={`No listings match "${q}"`}>Try another word or clear the category.</EmptyState>
        ) : (
          <EmptyState title="Nothing listed here yet">Check back soon, or list the first item.</EmptyState>
        ))}
      {listings && listings.length > 0 && (
        <ul className="grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
      {cursor && (
        <button className="more" disabled={loadingMore} onClick={() => void loadMore()}>
          Show more
        </button>
      )}
    </main>
  );
}
