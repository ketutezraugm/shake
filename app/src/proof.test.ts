import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "./contract";
import { commitmentFor } from "./crypto";
import { checkOwnOffer, rememberSealed, shortHash } from "./proof";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

const SALT = "00112233445566778899aabbccddeeff";

async function dealWith(...limits: string[]): Promise<Deal> {
  const buyer_commits = await Promise.all(limits.map((limit, i) => commitmentFor(7, "buyer", i + 1, limit, SALT)));
  return { id: 7, buyer_commits } as unknown as Deal;
}

describe("checkOwnOffer", () => {
  beforeEach(() => store.clear());

  it("confirms each round whose chain commitment is the offer this browser sent", async () => {
    rememberSealed(7, 1, "1200000", SALT);
    rememberSealed(7, 2, "1800000", SALT);

    expect(await checkOwnOffer(await dealWith("1200000", "1800000"))).toEqual([
      { round: 1, status: "matches" },
      { round: 2, status: "matches" },
    ]);
  });

  it("flags a round whose chain commitment is not what was sent", async () => {
    rememberSealed(7, 1, "1200000", SALT);

    expect(await checkOwnOffer(await dealWith("1300000"))).toEqual([{ round: 1, status: "differs" }]);
  });

  it("says it cannot check a round this browser never saw", async () => {
    expect(await checkOwnOffer(await dealWith("1200000"))).toEqual([{ round: 1, status: "unavailable" }]);
  });
});

describe("shortHash", () => {
  it("keeps the first and last eight characters", () => {
    expect(shortHash("789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904")).toBe("78970543…3479b904");
  });
});
