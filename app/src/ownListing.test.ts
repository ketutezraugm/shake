import { afterEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "./contract";
import { canReopen, closeListing, FUNDING_WINDOW_NS, myListing, reopenListing, slotsToAdd } from "./ownListing";
import type { Signer } from "./signer";

const signer: Signer = {
  accountId: "dita.testnet",
  signRequest: async (method, path) => ({ "x-test": `${method} ${path}` }),
  call: async () => null,
};

describe("ownListing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds a batch of 3, fewer near the limit, none at it", () => {
    expect(slotsToAdd(3)).toBe(3);
    expect(slotsToAdd(8)).toBe(2);
    expect(slotsToAdd(10)).toBe(0);
    expect(slotsToAdd(12)).toBe(0);
  });

  it("lets the seller reopen only after the buyer's 24 h to pay have passed", () => {
    const matched = { state: "Matched", matched_at_ns: 100 } as Deal;

    expect(canReopen(matched, 100 + FUNDING_WINDOW_NS)).toBe(false); // the contract expires strictly after the window
    expect(canReopen(matched, 100 + FUNDING_WINDOW_NS + 1)).toBe(true);
    expect(canReopen({ ...matched, state: "Funded" } as Deal, 1e30)).toBe(false); // paid: nothing to expire
    expect(canReopen({ ...matched, matched_at_ns: null } as Deal, 1e30)).toBe(false);
    expect(canReopen(null, 1e30)).toBe(false);
  });

  it("reopens by expiring the deal on chain first, then syncing the listing", async () => {
    const order: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      order.push(`sync ${url}`);
      return new Response("{}");
    });

    await reopenListing({ expire: async (id: number) => void order.push(`expire ${id}`) }, "http://relayer", "abc", 7);

    expect(order).toEqual(["expire 7", "sync http://relayer/listings/abc/sync"]);
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
