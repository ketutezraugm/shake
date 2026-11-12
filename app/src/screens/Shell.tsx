import type { ReactNode } from "react";
import { currentHandle } from "../accounts";
import { Link } from "../routes";
import { AccountMenu } from "./AccountMenu";

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

/** Abel's frame around every screen: the shake wordmark, a sign-in or account chip, and the bottom tabs. */
export function Shell({ path, signedIn, children }: { path: string; signedIn: boolean; children: ReactNode }) {
  const handle = currentHandle();
  const tabs = [BROWSE, SELL, INBOX, ...(handle ? [SHOP(handle)] : [])];

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          shake
        </Link>
        <AccountMenu />
      </header>
      {children}
      {signedIn && (
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
      )}
    </div>
  );
}
