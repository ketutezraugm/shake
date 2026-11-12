import { describe, expect, it } from "vitest";
import { parseRoute } from "./routes";

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
    expect(parseRoute("/signup")).toEqual({ name: "signup" });
    expect(parseRoute("/keys")).toEqual({ name: "keys" });
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
