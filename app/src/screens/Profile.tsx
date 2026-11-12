import { useEffect, useState } from "react";
import type { Shop } from "../market";
import { market } from "../marketSource";
import { ListingCard } from "./ListingCard";

export function Profile({ handle }: { handle: string }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setShop(undefined);
    setError(null);
    market
      .profile(handle)
      .then((found) => current && setShop(found))
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [handle]);

  if (error) return <main className="screen"><p className="error" role="alert">{error}</p></main>;
  if (shop === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (shop === null) {
    return (
      <main className="screen">
        <h1 className="headline">Shop not found</h1>
        <p className="muted">No shop is called @{handle}.</p>
      </main>
    );
  }

  const { profile, listings, soldCount } = shop;
  return (
    <main className="screen">
      {profile.avatarUrl && <img src={profile.avatarUrl} alt="" />}
      <h1 className="headline">{profile.displayName}</h1>
      <p className="muted">
        @{profile.handle}
        {profile.city && ` · ${profile.city}`} · {soldCount} sold
      </p>
      {profile.bio && <p>{profile.bio}</p>}

      {listings.length === 0 ? (
        <p className="muted">Nothing for sale right now.</p>
      ) : (
        <ul>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </main>
  );
}
