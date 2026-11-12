import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { currentAccess, type Access } from "./accounts";
import { Chat } from "./screens/Chat";
import { Create } from "./screens/Create";
import { DealPage } from "./screens/DealPage";
import { Demo } from "./screens/Demo";
import { Handle } from "./screens/Handle";
import { Home } from "./screens/Home";
import { Inbox } from "./screens/Inbox";
import { Join } from "./screens/Join";
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
  | { name: "handle" }
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
  "/handle": { name: "handle" },
  "/new": { name: "create" },
  "/demo": { name: "demo" },
};

export function parseRoute(path: string): Route {
  const fixed = FIXED[path];
  if (fixed) return fixed;

  // Same characters as account handles (isValidHandle in accounts.ts), so a shop link is always a valid handle.
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

// Part of signing in, so open to everyone.
const SIGN_IN_ROUTES = new Set<Route["name"]>(["signin", "handle"]);
// What a Google/email viewer may see; everything else buys, sells or chats and needs a wallet account.
const BROWSE_ROUTES = new Set<Route["name"]>(["home", "profile", "listing"]);

/** Where a visitor with `access` is sent instead of `route`, or null when they may stay; /signin offers the wallet. */
export function redirectFor(route: Route, access: Access): string | null {
  if (access === "trader" || SIGN_IN_ROUTES.has(route.name)) return null;
  if (access === "viewer" && BROWSE_ROUTES.has(route.name)) return null;
  return "/signin";
}

export function navigate(to: string, replace = false): void {
  if (replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
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

function usePath(): string {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onChange = () => setPath(location.pathname);
    addEventListener("popstate", onChange);
    return () => removeEventListener("popstate", onChange);
  }, []);
  return path;
}

export function Router() {
  const path = usePath();
  const route = parseRoute(path);
  const access = currentAccess();
  const redirect = redirectFor(route, access);

  // Replace, not push, so Back does not return to a page that only bounces again.
  useEffect(() => {
    if (redirect) navigate(redirect, true);
  }, [redirect]);
  if (redirect) return null;

  return (
    <Shell path={path} signedIn={access !== "none"}>
      <Page route={route} />
    </Shell>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <Home />;
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
    case "handle":
      return <Handle />;
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
