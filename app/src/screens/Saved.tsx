import { useEffect, useState } from "react";
import { market } from "../marketSource";
import type { ShopListing } from "../market";
import { savedIds, SAVED_EVENT } from "../saved";
import { Link } from "../routes";
import { ListingCard } from "./ListingCard";

/** The items this browser saved, newest first. A sold or closed one stays, marked as such; one the server no longer has is dropped. */
export function Saved() {
  const [ids, setIds] = useState(() => savedIds());
  const [listings, setListings] = useState<ShopListing[] | null>(null);

  useEffect(() => {
    const sync = () => setIds(savedIds());
    addEventListener(SAVED_EVENT, sync);
    return () => removeEventListener(SAVED_EVENT, sync);
  }, []);

  useEffect(() => {
    let current = true;
    void Promise.all(ids.map((id) => market.listing(id).catch(() => null))).then((found) => {
      if (current) setListings(found.filter((listing): listing is ShopListing => listing !== null));
    });
    return () => {
      current = false;
    };
  }, [ids]);

  return (
    <main className="page">
      <h1 className="headline">Saved</h1>
      {listings === null && ids.length > 0 && <p className="muted">Loading…</p>}
      {ids.length === 0 && (
        <p className="muted">
          Nothing saved yet. Tap the heart on an item to keep it here. <Link to="/">Browse items</Link>
        </p>
      )}
      {listings !== null && listings.length > 0 && (
        <ul className="grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </main>
  );
}
