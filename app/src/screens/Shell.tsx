import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import lockup from "../design/assets/logo/shake-lockup.svg";
import { Link, navigate } from "../routes";
import { AccountMenu } from "./AccountMenu";
import { Footer } from "./Footer";
import { BubbleIcon, GridIcon, HeartIcon, TagIcon } from "./icons";
import { ShopMenu } from "./ShopMenu";
import { OfflineBanner } from "./States";

type Tab = { to: string; label: string; icon: ReactNode };

const BROWSE: Tab = { to: "/", label: "Browse", icon: <GridIcon /> };
const INBOX: Tab = { to: "/inbox", label: "Inbox", icon: <BubbleIcon /> };
const SAVED: Tab = { to: "/saved", label: "Saved", icon: <HeartIcon /> };
const OFFERS: Tab = { to: "/offers", label: "My offers", icon: <TagIcon /> };
const TABS = [BROWSE, SAVED, OFFERS, INBOX];

/** A chat lives inside the inbox, so the inbox tab stays lit on it. */
function isCurrent(tab: Tab, path: string): boolean {
  return path === tab.to || (tab.to === "/inbox" && path.startsWith("/chat/"));
}

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
        <Link key={tab.to} to={tab.to} className="desk-link" current={isCurrent(tab, path)}>
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
  // The footer closes the pages people browse; the offer, chat and sign-in flows stay free of it.
  const showFooter = path === "/" || path === "/welcome" || path.startsWith("/@") || path.startsWith("/l/");
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
        <DeskNav tabs={TABS} path={path} />
        <ShopMenu />
        <AccountMenu />
      </header>
      {children}
      {showFooter && <Footer />}
      <div className="tabs">
        <nav aria-label="Main">
          {TABS.map((tab) => (
            <Link key={tab.to} to={tab.to} className="tab" current={isCurrent(tab, path)}>
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
