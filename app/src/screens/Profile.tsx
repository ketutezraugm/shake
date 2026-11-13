import { useEffect, useState } from "react";
import { currentHandle } from "../accounts";
import type { Shop } from "../market";
import { market } from "../marketSource";
import { Link } from "../routes";
import { ListingCard } from "./ListingCard";
import { ErrorState, NotFound } from "./States";

export function Profile({ handle }: { handle: string }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
  }, [handle, attempt]);

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/@${handle}`);
    setCopied(true);
  }

  if (error) return <main className="page"><ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} /></main>;
  if (shop === undefined) return <main className="page"><p className="muted">Loading…</p></main>;
  if (shop === null) {
    return <NotFound title="Shop not found">No shop is called @{handle}.</NotFound>;
  }

  const { profile, listings, soldCount } = shop;
  return (
    <main className="page profile-layout">
      <section className="profile-head" aria-label="Shop">
        <div className="profile-row">
          {profile.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" /> : <span className="avatar" aria-hidden="true">{profile.displayName.charAt(0).toUpperCase()}</span>}
          <div>
            <h1>{profile.displayName}</h1>
            <p className="muted">
              @{profile.handle}
              {profile.city && ` · ${profile.city}`}
            </p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <b className="num">{soldCount}</b>sold
          </div>
          <div className="stat sky">
            <b className="num">{listings.length}</b>for sale
          </div>
        </div>
        {profile.bio && <p>{profile.bio}</p>}
        <button className="outline-button" onClick={() => void copyLink()}>
          {copied ? "Link copied" : "Copy shop link"}
        </button>
        {currentHandle() === profile.handle && (
          <Link to="/keys" className="link-button">
            Use on another device
          </Link>
        )}
      </section>

      <div className="profile-listings">
        <div className="section-head">
          <h2>For sale</h2>
        </div>
        <p className="muted">Open an item and make a blind offer up to the asking price.</p>

        {listings.length === 0 ? (
          <p className="muted">Nothing for sale right now.</p>
        ) : (
          <ul className="grid">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
