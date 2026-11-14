// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentAccount, handleSuggestions, isHandleTaken, isValidHandle, saveHandle, signOut, currentHandle } from "./accounts";
import { RelayerError } from "./relayer";

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

  it("tells a taken handle from other refusals", () => {
    expect(isHandleTaken(new RelayerError("Saving your shop failed: that handle is taken", 409))).toBe(true);
    expect(isHandleTaken(new RelayerError("this login already has an account", 409))).toBe(false);
  });
});

describe("signOut", () => {
  it("forgets the account and the wallet session", () => {
    const storage = fakeStorage();
    storage.setItem("blind-deal:account", "alice.testnet");
    storage.setItem("blind-deal:wallet-session", "{}");
    signOut(storage);
    expect(currentAccount(storage)).toBeNull();
    expect(storage.getItem("blind-deal:wallet-session")).toBeNull();
  });
});

describe("currentHandle", () => {
  it("prefers the stored shop handle over the account id", () => {
    const storage = fakeStorage();
    storage.setItem("blind-deal:account", "harfi02.testnet");
    expect(currentHandle(storage)).toBe("harfi02");
    saveHandle("harfi", storage);
    expect(currentHandle(storage)).toBe("harfi");
  });
});
