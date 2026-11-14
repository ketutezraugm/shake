import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLinkedShop } from "./wallet";

const reply = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("fetchLinkedShop", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the account and shop a login was linked to", async () => {
    reply(200, { account: "asura01.testnet", profile: { handle: "asura" } });
    expect(await fetchLinkedShop("http://relayer", "token")).toEqual({ account: "asura01.testnet", profile: { handle: "asura" } });
  });

  it("returns null for a login that was never linked or has expired", async () => {
    reply(404, { error: "this login is not linked to a shop" });
    expect(await fetchLinkedShop("http://relayer", "token")).toBeNull();
    reply(401, { error: "sign in first" });
    expect(await fetchLinkedShop("http://relayer", "token")).toBeNull();
  });

  it("lets other failures surface", async () => {
    reply(500, { error: "boom" });
    await expect(fetchLinkedShop("http://relayer", "token")).rejects.toThrow("boom");
  });
});
