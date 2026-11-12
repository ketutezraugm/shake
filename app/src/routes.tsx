import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Create } from "./screens/Create";
import { DealPage } from "./screens/DealPage";
import { Demo } from "./screens/Demo";
import { Home } from "./screens/Home";
import { Join } from "./screens/Join";
import { Profile } from "./screens/Profile";

export type Route =
  | { name: "home" }
  | { name: "profile"; handle: string }
  | { name: "listing"; id: string }
  | { name: "sell" }
  | { name: "offer"; dealId: number }
  | { name: "inbox" }
  | { name: "signin" }
  // Test UI from D1-10; the offer flow (MK-24) replaces these.
  | { name: "create" }
  | { name: "deal"; id: number }
  | { name: "join"; id: number }
  | { name: "demo" }
  | { name: "notFound" };

const FIXED: Record<string, Route> = {
  "/": { name: "home" },
  "/sell": { name: "sell" },
  "/inbox": { name: "inbox" },
  "/signin": { name: "signin" },
  "/new": { name: "create" },
  "/demo": { name: "demo" },
};

export function parseRoute(path: string): Route {
  const fixed = FIXED[path];
  if (fixed) return fixed;

  // Same characters as account handles (accounts.ts), so a shop link is always a valid handle.
  const profile = /^\/@([a-z0-9-]{1,32})$/.exec(path);
  if (profile) return { name: "profile", handle: profile[1]! };

  const listing = /^\/l\/([^/]+)$/.exec(path);
  if (listing) return { name: "listing", id: listing[1]! };

  const offer = /^\/deals\/(\d+)$/.exec(path);
  if (offer) return { name: "offer", dealId: Number(offer[1]) };

  const deal = /^\/d\/(\d+)(\/join)?$/.exec(path);
  if (deal) return { name: deal[2] ? "join" : "deal", id: Number(deal[1]) };

  return { name: "notFound" };
}

export function navigate(to: string): void {
  history.pushState(null, "", to);
  dispatchEvent(new PopStateEvent("popstate"));
}

/** An in-app link: a real `<a>` so new-tab and copy-link still work, routed without a page load. */
export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  }
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

function usePath(): string {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onChange = () => setPath(location.pathname);
    addEventListener("popstate", onChange);
    return () => removeEventListener("popstate", onChange);
  }, []);
  return path;
}

// Screens not built yet; each names the task that builds it.
function Pending({ title, task }: { title: string; task: string }) {
  return (
    <main className="screen">
      <h1 className="headline">{title}</h1>
      <p className="muted">Coming in {task}.</p>
    </main>
  );
}

export function Router() {
  const route = parseRoute(usePath());
  switch (route.name) {
    case "home":
      return <Home />;
    case "profile":
      return <Profile handle={route.handle} />;
    case "listing":
      return <Pending title="Listing" task="MK-23" />;
    case "sell":
      return <Pending title="Sell something" task="MK-22" />;
    case "offer":
      return <Pending title="Your offer" task="MK-24" />;
    case "inbox":
      return <Pending title="Inbox" task="MK-25" />;
    case "signin":
      return <Pending title="Sign in" task="MK-20" />;
    case "create":
      return <Create />;
    case "deal":
      return <DealPage id={route.id} />;
    case "join":
      return <Join id={route.id} />;
    case "demo":
      return <Demo />;
    case "notFound":
      return <main className="screen"><h1>Not found</h1></main>;
  }
}
