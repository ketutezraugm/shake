import { useEffect, useState } from "react";
import { currentAccount, currentHandle } from "../accounts";
import type { Shop } from "../market";
import { useMediaQuery, useWaiting } from "../menuHooks";
import { market } from "../marketSource";
import { readMenuHidden, sectionFromQuery, writeMenuHidden, type ShopSection } from "../shopSection";
import { Inbox } from "./Inbox";
import { ListingCard } from "./ListingCard";
import { Orders } from "./Orders";
import { Sell } from "./Sell";
import { ShopRail } from "./ShopRail";
import { ShopSidebar } from "./ShopSidebar";
import { ErrorState, NotFound } from "./States";

export function Profile({ handle }: { handle: string }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<ShopSection>(() => sectionFromQuery(location.search));
  const [menuHidden, setMenuHidden] = useState(readMenuHidden);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 900px)");

  const owner = currentAccount() !== null && handle === currentHandle();
  const waiting = useWaiting(owner ? currentAccount() : null);

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

  function selectSection(next: ShopSection) {
    setTab(next);
    setDrawerOpen(false);
    // replaceState so switching sections doesn't fill the back button; a refresh keeps the section.
    history.replaceState(null, "", next === "products" ? location.pathname : `?tab=${next}`);
  }

  function onPublished() {
    selectSection("products");
    setAttempt((a) => a + 1); // reload so the new product shows in the list
  }

  function setHidden(hidden: boolean) {
    setMenuHidden(hidden);
    writeMenuHidden(hidden);
  }

  // Escape closes the phone drawer, like the header menus.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (error) return <main className="page"><ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} /></main>;
  if (shop === undefined) return <main className="page"><p className="muted">Loading…</p></main>;
  if (shop === null) {
    return <NotFound title="Shop not found">No shop is called @{handle}.</NotFound>;
  }

  const { profile, listings, soldCount } = shop;
  const account = currentAccount();
  const isOwner = account !== null && handle === currentHandle();

  const forSale = (
    <>
      {!isOwner && <p className="muted">Open an item and make a blind offer up to the asking price.</p>}
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
  );

  if (isOwner && account) {
    return (
      <main className={`page shop-admin${menuHidden ? " menu-hidden" : ""}`}>
        {desktop && !menuHidden ? (
          <ShopSidebar shop={shop} section={tab} waiting={waiting} copied={copied} onSelect={selectSection} onHide={() => setHidden(true)} onCopy={() => void copyLink()} />
        ) : (
          <ShopRail shop={shop} section={tab} waiting={waiting} onSelect={selectSection} onExpand={() => (desktop ? setHidden(false) : setDrawerOpen(true))} />
        )}
        {!desktop && drawerOpen && (
          <div className="sidebar-drawer">
            <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
            <ShopSidebar shop={shop} section={tab} waiting={waiting} copied={copied} onSelect={selectSection} onHide={() => setDrawerOpen(false)} onCopy={() => void copyLink()} />
          </div>
        )}
        <div className="shop-content">
          {tab === "inbox" ? (
            <Inbox side="selling" embedded />
          ) : tab === "orders" ? (
            <Orders account={account} />
          ) : tab === "add-product" ? (
            <Sell embedded onPublished={onPublished} />
          ) : (
            forSale
          )}
        </div>
      </main>
    );
  }

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
      <div className="profile-listings">{forSale}</div>
    </main>
  );
}
