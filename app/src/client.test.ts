import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainFor, clientFor } from "./client";
import { sealLimit } from "./crypto";
import { MOCK_TEE_PUBLIC_KEY, sha256 } from "./mockClient";

/** The dev server's /__mock-chain middleware: one JSON document that every browser reads and writes. */
let stored: string;
beforeEach(() => {
  stored = "[]";
  vi.useFakeTimers();
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      stored = String(init.body);
      return new Response("");
    }
    return new Response(stored);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("clientFor: two browsers on one mock chain", () => {
  it("lets a buyer in another tab meet the seller, and the TEE's answer lands once for both", async () => {
    const seller = clientFor("seller.test");
    const buyer = clientFor("buyer.test");

    const id = await seller.createDeal("Bike", "", await sha256("tok"), 1);
    const s = await sealLimit(id, "seller", 1, "4000000", MOCK_TEE_PUBLIC_KEY);
    await seller.submitLimit(id, s.ct, s.commit, null);
    const b = await sealLimit(id, "buyer", 1, "4600000", MOCK_TEE_PUBLIC_KEY);
    await buyer.submitLimit(id, b.ct, b.commit, "tok");

    expect((await seller.getDeal(id))!.state).toBe("Computing");
    vi.advanceTimersByTime(3_000);
    const seenBySeller = (await seller.getDeal(id))!;
    const seenByBuyer = (await buyer.getDeal(id))!;

    expect(seenBySeller.state).toBe("Matched");
    expect(seenByBuyer.price).toBe(seenBySeller.price); // one price, not one per tab
    expect(JSON.parse(stored)[id].state).toBe("Matched"); // the read that settled it was saved
  });
});

describe("chainFor", () => {
  it("serves the mock chain with a Signer and the mock TEE key when no contract is configured", () => {
    const access = chainFor("alice.test");

    expect(access.signer.accountId).toBe("alice.test");
    expect(access.teePubkey).toBe(MOCK_TEE_PUBLIC_KEY);
    expect(typeof access.client.getDeal).toBe("function");
  });
});
