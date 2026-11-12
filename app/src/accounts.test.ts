// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentAccount, exportBackup, handleSuggestions, importBackup, isHandleTaken, isValidHandle, openAccount } from "./accounts";
import { loadIdentity } from "./keys";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("accounts", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("accepts the relayer's handles and nothing else", () => {
    expect(["dita", "dita-shop", "a1"].every(isValidHandle)).toBe(true);
    expect(["a", "-dita", "dita-", "di--ta", "Dita", "di.ta"].some(isValidHandle)).toBe(false);
  });

  it("suggests valid handles, shortening a long one to fit", () => {
    expect(handleSuggestions("dita")).toEqual(["dita-shop", "dita-preloved"]);
    expect(handleSuggestions("a".repeat(32)).every(isValidHandle)).toBe(true);
  });

  it("opens an account with the login token and only the public key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ accountId: "dita.app.testnet" }));
    });

    const account = await openAccount("http://relayer", "jwt-123", "dita");

    expect(account).toBe("dita.app.testnet");
    expect(currentAccount()).toBe("dita.app.testnet");
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer jwt-123");
    const body = String(calls[0]?.init.body);
    expect(JSON.parse(body)).toEqual({ handle: "dita", publicKey: loadIdentity().publicKey });
    expect(body).not.toContain(String(localStorage.getItem("blind-deal:key")).replace(/^ed25519:/, ""));
  });

  it("tells a taken handle from other refusals", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "that handle is taken" }), { status: 409 }));
    const taken = await openAccount("http://relayer", "jwt", "dita").catch((e: unknown) => e);

    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "this login already has an account" }), { status: 409 }));
    const second = await openAccount("http://relayer", "jwt", "dita").catch((e: unknown) => e);

    expect(isHandleTaken(taken)).toBe(true);
    expect(isHandleTaken(second)).toBe(false);
  });

  it("moves an account to another device with one backup key", () => {
    const here = fakeStorage();
    here.setItem("blind-deal:account", "dita.app.testnet");
    const there = fakeStorage();

    const account = importBackup(exportBackup(here), there);

    expect(account).toBe("dita.app.testnet");
    expect(currentAccount(there)).toBe("dita.app.testnet");
    expect(loadIdentity(there).publicKey).toBe(loadIdentity(here).publicKey);
  });

  it("refuses a backup key that is cut short or not a key", () => {
    expect(() => importBackup("ed25519:abc", fakeStorage())).toThrow("looks incomplete");
    expect(() => importBackup("dita.app.testnet:not-a-key", fakeStorage())).toThrow("not a valid key");
  });

  it("will not export before there is an account", () => {
    expect(() => exportBackup(fakeStorage())).toThrow("sign in first");
  });
});
