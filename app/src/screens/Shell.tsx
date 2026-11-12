import { useState, type FormEvent, type ReactNode } from "react";
import { currentAccount } from "../accounts";
import lockup from "../design/assets/logo/shake-lockup.svg";
import { Link, navigate } from "../routes";
import { OfflineBanner } from "./States";

type Tab = { to: string; label: string; icon: ReactNode };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const BROWSE: Tab = {
  to: "/",
  label: "Browse",
  icon: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  ),
};
const SELL: Tab = {
  to: "/sell",
  label: "Sell",
  icon: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
};
const INBOX: Tab = {
  to: "/inbox",
  label: "Inbox",
  icon: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" />
    </svg>
  ),
};
const SHOP = (handle: string): Tab => ({
  to: `/@${handle}`,
  label: "My shop",
  icon: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 9l1.5-5h13L20 9M4 9v10h16V9M4 9h16M9 19v-5h6v5" />
    </svg>
  ),
});

/**
 * Abel's frame around every screen. On a phone: the wordmark, an account chip and the bottom tab bar.
 * On a wide screen (frames "Desktop 1-9"): a white header with the logo, a search field and the main links.
 */
export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const account = currentAccount();
  const handle = account?.split(".")[0];
  const tabs = [BROWSE, SELL, INBOX, ...(handle ? [SHOP(handle)] : [])];
  const [draft, setDraft] = useState(() => new URLSearchParams(location.search).get("q") ?? "");

  function search(event: FormEvent) {
    event.preventDefault();
    const q = draft.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  const chip = handle ? (
    <Link to={`/@${handle}`} className="pill">
      @{handle}
    </Link>
  ) : (
    <Link to="/signin" className="pill">
      Sign in
    </Link>
  );

  return (
    <div className="shell">
      <OfflineBanner />
      <header className="topbar">
        <Link to="/" className="brand mobile-only">
          shake
        </Link>
        <Link to="/" className="brand-logo desktop-only">
          <img src={lockup} alt="Shake home" />
        </Link>
        <form role="search" className="header-search desktop-only" onSubmit={search}>
          <label>
            <span className="sr-only">Search listings</span>
            <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search cameras, bikes, jackets…" />
          </label>
        </form>
        <nav className="desk-nav desktop-only" aria-label="Main">
          {tabs.map((tab) => (
            <Link key={tab.to} to={tab.to} className="desk-link" current={path === tab.to}>
              {tab.label}
            </Link>
          ))}
        </nav>
        {chip}
      </header>
      {children}
      <div className="tabs">
        <nav aria-label="Main">
          {tabs.map((tab) => (
            <Link key={tab.to} to={tab.to} className="tab" current={path === tab.to}>
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
