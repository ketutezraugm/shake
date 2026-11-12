import { useEffect, useState } from "react";
import { Create } from "./screens/Create";
import { DealPage } from "./screens/DealPage";
import { Demo } from "./screens/Demo";
import { Join } from "./screens/Join";
import { Landing } from "./screens/Landing";

export type Route =
  | { name: "landing" }
  | { name: "create" }
  | { name: "deal"; id: number }
  | { name: "join"; id: number }
  | { name: "demo" }
  | { name: "notFound" };

export function parseRoute(path: string): Route {
  if (path === "/") return { name: "landing" };
  if (path === "/new") return { name: "create" };
  if (path === "/demo") return { name: "demo" };

  const deal = /^\/d\/(\d+)(\/join)?$/.exec(path);
  if (deal) return { name: deal[2] ? "join" : "deal", id: Number(deal[1]) };

  return { name: "notFound" };
}

export function navigate(to: string): void {
  history.pushState(null, "", to);
  dispatchEvent(new PopStateEvent("popstate"));
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
  const route = parseRoute(usePath());
  switch (route.name) {
    case "landing":
      return <Landing />;
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
