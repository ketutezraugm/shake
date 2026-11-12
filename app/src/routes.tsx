import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Chat } from "./screens/Chat";
import { Create } from "./screens/Create";
import { DealPage } from "./screens/DealPage";
import { Demo } from "./screens/Demo";
import { Handle } from "./screens/Handle";
import { Home } from "./screens/Home";
import { Inbox } from "./screens/Inbox";
import { Join } from "./screens/Join";
import { Keys } from "./screens/Keys";
import { Listing } from "./screens/Listing";
import { Offer } from "./screens/Offer";
import { Profile } from "./screens/Profile";
import { Sell } from "./screens/Sell";
import { Shell } from "./screens/Shell";
import { SignIn } from "./screens/SignIn";

export type Route =
  | { name: "home" }
  | { name: "profile"; handle: string }
  | { name: "listing"; id: string }
  | { name: "sell" }
  | { name: "offer"; dealId: number }
  | { name: "inbox" }
  | { name: "chat"; dealId: number }
  | { name: "signin" }
  | { name: "signup" }
  | { name: "keys" }
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
  "/signup": { name: "signup" },
  "/keys": { name: "keys" },
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

  const chat = /^\/chat\/(\d+)$/.exec(path);
  if (chat) return { name: "chat", dealId: Number(chat[1]) };

  const deal = /^\/d\/(\d+)(\/join)?$/.exec(path);
  if (deal) return { name: deal[2] ? "join" : "deal", id: Number(deal[1]) };

  return { name: "notFound" };
}

export function navigate(to: string): void {
  history.pushState(null, "", to);
  dispatchEvent(new PopStateEvent("popstate"));
}

/** An in-app link: a real `<a>` so new-tab and copy-link still work, routed without a page load. */
export function Link({ to, className, current, children }: { to: string; className?: string; current?: boolean; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  }
  return (
    <a href={to} className={className} onClick={onClick} aria-current={current ? "page" : undefined}>
      {children}
    </a>
  );
}

/** The current path plus its query string, so a search from the header re-renders the page. */
function usePath(): string {
  const [path, setPath] = useState(location.pathname + location.search);
  useEffect(() => {
    const onChange = () => setPath(location.pathname + location.search);
    addEventListener("popstate", onChange);
    return () => removeEventListener("popstate", onChange);
  }, []);
  return path;
}

export function Router() {
  const [path = "/", query = ""] = usePath().split("?");
  return (
    <Shell path={path}>
      <Page route={parseRoute(path)} query={query} />
    </Shell>
  );
}

function Page({ route, query }: { route: Route; query: string }) {
  switch (route.name) {
    case "home":
      return <Home key={query} initialQuery={new URLSearchParams(query).get("q") ?? ""} />;
    case "profile":
      return <Profile handle={route.handle} />;
    case "listing":
      return <Listing id={route.id} />;
    case "sell":
      return <Sell />;
    case "offer":
      return <Offer dealId={route.dealId} />;
    case "inbox":
      return <Inbox />;
    case "chat":
      return <Chat dealId={route.dealId} />;
    case "signin":
      return <SignIn />;
    case "signup":
      return <Handle />;
    case "keys":
      return <Keys />;
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
