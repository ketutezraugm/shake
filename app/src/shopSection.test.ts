import { describe, expect, it } from "vitest";
import { readMenuHidden, sectionFromQuery, writeMenuHidden } from "./shopSection";

describe("shop sections", () => {
  it("maps old tab names to the new sections", () => {
    expect(sectionFromQuery("?tab=for-sale")).toBe("products");
    expect(sectionFromQuery("?tab=sales")).toBe("orders");
    expect(sectionFromQuery("?tab=inbox")).toBe("inbox");
    expect(sectionFromQuery("")).toBe("products");
  });

  it("remembers a hidden menu, and survives storage that throws", () => {
    const store = new Map<string, string>();
    globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage;
    writeMenuHidden(true);
    expect(readMenuHidden()).toBe(true);
    globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    expect(readMenuHidden()).toBe(false);
    expect(() => writeMenuHidden(true)).not.toThrow();
  });
});
