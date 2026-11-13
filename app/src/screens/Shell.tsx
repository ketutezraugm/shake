import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { currentHandle } from "../accounts";
import lockup from "../design/assets/logo/shake-lockup.svg";
import { Link, navigate } from "../routes";
import { AccountMenu } from "./AccountMenu";
import { Footer } from "./Footer";
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
 * The wide-screen links. Each link holds its own underline, exactly as wide as its text (press.css), and only the
 * current link's is shown. When the current link changes, the new line starts where the old one was, at the old one's
 * width, and glides into place, so one line seems to travel. Sizes come from the rendered boxes, never from a guess.
 */
function DeskNav({ tabs, path }: { tabs: Tab[]; path: string }) {
  const nav = useRef<HTMLElement>(null);
  const last = useRef<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const line = nav.current?.querySelector<HTMLElement>('[aria-current="page"] .desk-line');
      if (!line || !nav.current) return null;
      const box = line.getBoundingClientRect();
      return { line, left: box.left - nav.current.getBoundingClientRect().left, width: box.width };
    };

    const now = measure();
    const from = last.current;
    last.current = now && { left: now.left, width: now.width };
    if (now && from && now.width > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      now.line.animate(
        [
          { translate: `${from.left - now.left}px 0`, scale: `${from.width / now.width} 1` },
          { translate: "0 0", scale: "1 1" },
        ],
        { duration: 400, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
      );
    }

    // A resized window moves the lines; remember where this one is now, so the next move starts from the right place.
    const remember = () => {
      const again = measure();
      last.current = again && { left: again.left, width: again.width };
    };
    addEventListener("resize", remember);
    return () => removeEventListener("resize", remember);
  }, [path, tabs.length]);

  return (
    <nav ref={nav} className="desk-nav desktop-only" aria-label="Main">
      {tabs.map((tab) => (
        <Link key={tab.to} to={tab.to} className="desk-link" current={path === tab.to}>
          <span className="desk-label" data-label={tab.label}>
            {tab.label}
          </span>
          <span className="desk-line" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}

/**
 * Abel's frame around every screen. On a phone: the wordmark, an account chip and the bottom tab bar.
 * On a wide screen (frames "Desktop 1-9"): a white header with the logo, a search field and the main links.
 */
export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const handle = currentHandle();
  // The footer closes the pages people browse; the offer, chat and sign-in flows stay free of it.
  const showFooter = path === "/" || path.startsWith("/@") || path.startsWith("/l/");
  const tabs = [BROWSE, SELL, INBOX, ...(handle ? [SHOP(handle)] : [])];
  const [draft, setDraft] = useState(() => new URLSearchParams(location.search).get("q") ?? "");

  function search(event: FormEvent) {
    event.preventDefault();
    const q = draft.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

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
        <DeskNav tabs={tabs} path={path} />
        <AccountMenu />
      </header>
      {children}
      {showFooter && <Footer />}
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
