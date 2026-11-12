import { describe, expect, it } from "vitest";
import { parseRoute, redirectFor } from "./routes";

describe("parseRoute", () => {
  it("maps the marketplace paths", () => {
    expect(parseRoute("/")).toEqual({ name: "home" });
    expect(parseRoute("/@demo")).toEqual({ name: "profile", handle: "demo" });
    expect(parseRoute("/@toko-bekas2")).toEqual({ name: "profile", handle: "toko-bekas2" });
    expect(parseRoute("/l/0f6c2b9e")).toEqual({ name: "listing", id: "0f6c2b9e" });
    expect(parseRoute("/sell")).toEqual({ name: "sell" });
    expect(parseRoute("/deals/12")).toEqual({ name: "offer", dealId: 12 });
    expect(parseRoute("/inbox")).toEqual({ name: "inbox" });
    expect(parseRoute("/chat/12")).toEqual({ name: "chat", dealId: 12 });
    expect(parseRoute("/chat/abc")).toEqual({ name: "notFound" });
    expect(parseRoute("/signin")).toEqual({ name: "signin" });
    expect(parseRoute("/handle")).toEqual({ name: "handle" });
  });

  it("keeps the test UI paths until the offer flow replaces them", () => {
    expect(parseRoute("/new")).toEqual({ name: "create" });
    expect(parseRoute("/d/3")).toEqual({ name: "deal", id: 3 });
    expect(parseRoute("/d/3/join")).toEqual({ name: "join", id: 3 });
    expect(parseRoute("/demo")).toEqual({ name: "demo" });
  });

  it("sends anything else to not found", () => {
    expect(parseRoute("/@")).toEqual({ name: "notFound" });
    expect(parseRoute("/@Demo")).toEqual({ name: "notFound" });
    expect(parseRoute("/deals/abc")).toEqual({ name: "notFound" });
    expect(parseRoute("/l/a/b")).toEqual({ name: "notFound" });
  });
});

describe("redirectFor", () => {
  it("keeps a signed-out visitor on the sign-in screens and sends every other page to /signin", () => {
    for (const path of ["/signin", "/handle"]) expect(redirectFor(parseRoute(path), "none")).toBeNull();
    for (const path of ["/", "/sell", "/inbox", "/@demo", "/l/abc", "/deals/3", "/chat/3", "/nowhere"]) {
      expect(redirectFor(parseRoute(path), "none")).toBe("/signin");
    }
  });

  it("lets a Google/email viewer browse, and sends buying, selling and chat to /signin for a wallet", () => {
    for (const path of ["/", "/@demo", "/l/abc", "/signin", "/handle"]) expect(redirectFor(parseRoute(path), "viewer")).toBeNull();
    for (const path of ["/sell", "/inbox", "/deals/3", "/chat/3", "/new"]) expect(redirectFor(parseRoute(path), "viewer")).toBe("/signin");
  });

  it("lets a wallet trader see everything", () => {
    for (const path of ["/", "/sell", "/inbox", "/deals/3", "/@demo", "/signin"]) expect(redirectFor(parseRoute(path), "trader")).toBeNull();
  });
});
