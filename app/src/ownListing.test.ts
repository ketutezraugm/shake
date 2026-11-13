import { afterEach, describe, expect, it, vi } from "vitest";
import { closeListing, myListing, slotsToAdd } from "./ownListing";
import type { Signer } from "./signer";

const signer: Signer = {
  accountId: "dita.testnet",
  signRequest: async (method, path) => ({ "x-test": `${method} ${path}` }),
  call: async () => null,
  send: async () => "",
};

describe("ownListing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds a batch of 3, fewer near the limit, none at it", () => {
    expect(slotsToAdd(3)).toBe(3);
    expect(slotsToAdd(8)).toBe(2);
    expect(slotsToAdd(10)).toBe(0);
    expect(slotsToAdd(12)).toBe(0);
  });

  it("finds one listing among the seller's own", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify([{ id: "a", slots: [] }, { id: "b", slots: [{ dealId: 1, buyerAccount: null }] }])));

    const found = await myListing("http://relayer", signer, "b");

    expect(found?.slots).toHaveLength(1);
    expect(await myListing("http://relayer", signer, "zzz")).toBeUndefined();
  });

  it("closes a listing with a signed POST to its own path", async () => {
    const calls: { url: string; method?: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method, headers: init.headers as Record<string, string> });
      return new Response("{}");
    });

    await closeListing("http://relayer", signer, "abc");

    expect(calls[0]).toMatchObject({ url: "http://relayer/listings/abc/close", method: "POST" });
    expect(calls[0]?.headers["x-test"]).toBe("POST /listings/abc/close");
  });

  it("says why closing failed", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "listing is not open" }), { status: 409 }));

    await expect(closeListing("http://relayer", signer, "abc")).rejects.toThrow("closing the listing failed: listing is not open");
  });
});
