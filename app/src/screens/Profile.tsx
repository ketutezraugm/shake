import { useEffect, useState, type KeyboardEvent } from "react";
import { currentAccount, currentHandle } from "../accounts";
import type { Shop } from "../market";
import { market } from "../marketSource";
import { ListingCard } from "./ListingCard";
import { Sales } from "./Sales";
import { ErrorState, NotFound } from "./States";

const TABS = [
  { key: "for-sale", label: "For sale" },
  { key: "sales", label: "Your sales" },
] as const;
type ShopTab = (typeof TABS)[number]["key"];

function tabFromUrl(): ShopTab {
  return new URLSearchParams(location.search).get("tab") === "sales" ? "sales" : "for-sale";
}

export function Profile({ handle }: { handle: string }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<ShopTab>(tabFromUrl);

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

  function selectTab(next: ShopTab) {
    setTab(next);
    // replaceState so switching tabs doesn't fill the back button; a refresh keeps the tab.
    history.replaceState(null, "", next === "sales" ? "?tab=sales" : location.pathname);
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = tab === "for-sale" ? "sales" : "for-sale";
    selectTab(next);
    document.getElementById(`shop-tab-${next}`)?.focus();
  }

  if (error) return <main className="page"><ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} /></main>;
  if (shop === undefined) return <main className="page"><p className="muted">Loading…</p></main>;
  if (shop === null) {
    return <NotFound title="Shop not found">No shop is called @{handle}.</NotFound>;
  }

  const { profile, listings, soldCount } = shop;
  const account = currentAccount();
  const isOwner = account !== null && handle === currentHandle();
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
      </section>

      <div className="profile-listings">
        {isOwner && (
          <div className="shop-tabs" role="tablist" aria-label="Shop sections" onKeyDown={onTabKey}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                id={`shop-tab-${key}`}
                role="tab"
                aria-selected={tab === key}
                aria-controls="shop-panel"
                tabIndex={tab === key ? 0 : -1}
                onClick={() => selectTab(key)}
              >
                {label}
                {key === "for-sale" && <span className="num"> {listings.length}</span>}
              </button>
            ))}
          </div>
        )}

        <div id="shop-panel" role={isOwner ? "tabpanel" : undefined} aria-labelledby={isOwner ? `shop-tab-${tab}` : undefined}>
          {isOwner && tab === "sales" && account ? (
            <Sales account={account} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
