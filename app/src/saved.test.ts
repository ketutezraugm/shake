import { describe, expect, it } from "vitest";
import { isSaved, savedIds, toggleSaved } from "./saved";

function memory(): Storage {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) } as unknown as Storage;
}

describe("saved items", () => {
  // The change event goes to `window`; node has none, so give the file a stand-in.
  globalThis.dispatchEvent ??= () => true;

  it("adds, lists newest first, and removes", () => {
    const storage = memory();
    expect(toggleSaved("a", storage)).toBe(true);
    expect(toggleSaved("b", storage)).toBe(true);
    expect(savedIds(storage)).toEqual(["b", "a"]);
    expect(isSaved("a", storage)).toBe(true);

    expect(toggleSaved("a", storage)).toBe(false);
    expect(savedIds(storage)).toEqual(["b"]);
    expect(isSaved("a", storage)).toBe(false);
  });

  it("starts empty and survives a damaged value", () => {
    const storage = memory();
    expect(savedIds(storage)).toEqual([]);
    storage.setItem("blind-deal:saved", "{not json");
    expect(savedIds(storage)).toEqual([]);
  });
});
