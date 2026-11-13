import { describe, expect, it } from "vitest";
import { currentRole, setRole, tabsFor } from "./role";

function memory(): Storage {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) } as unknown as Storage;
}

describe("tabsFor", () => {
  it("gives a buyer Browse, Saved, My offers and Inbox, with no Sell or My shop", () => {
    expect(tabsFor("buyer", true)).toEqual(["browse", "saved", "offers", "inbox"]);
  });

  it("gives a seller Browse, Sell, Inbox and, with a handle, My shop", () => {
    expect(tabsFor("seller", true)).toEqual(["browse", "sell", "inbox", "shop"]);
    expect(tabsFor("seller", false)).toEqual(["browse", "sell", "inbox"]);
  });
});

describe("role", () => {
  it("defaults to seller and switches", () => {
    const storage = memory();
    expect(currentRole(storage)).toBe("seller");
    setRole("buyer", storage);
    expect(currentRole(storage)).toBe("buyer");
    setRole("seller", storage);
    expect(currentRole(storage)).toBe("seller");
  });
});
