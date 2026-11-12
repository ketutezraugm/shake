import { describe, expect, it } from "vitest";
import { MockChain, encodeMockLimit, mockClient, sha256 } from "./mockClient";
import { parseRoute } from "./routes";

const NO_COMMIT = Array<number>(32).fill(0);
const YOCTO_PER_RP = 10n ** 16n;

async function runDeal(min: number, max: number, rounds = 1) {
  const chain = new MockChain();
  const seller = mockClient(chain, "seller.test");
  const buyer = mockClient(chain, "buyer.test");
  const id = await seller.createDeal("Bike", "", await sha256("tok"), rounds);
  await seller.submitLimit(id, encodeMockLimit(min), NO_COMMIT, null);
  await buyer.submitLimit(id, encodeMockLimit(max), NO_COMMIT, "tok");
  return { deal: (await seller.getDeal(id))!, buyer, id };
}

describe("mock client", () => {
  it("matches at a price inside the overlap", async () => {
    const { deal } = await runDeal(4_000_000, 4_600_000);
    const priceRp = BigInt(deal.price!) / YOCTO_PER_RP;

    expect(deal.state).toBe("Matched");
    expect(priceRp >= 4_000_000n && priceRp <= 4_600_000n).toBe(true);
  });

  it("ends in no deal without an overlap, or retries while rounds remain", async () => {
    expect((await runDeal(5_000_000, 4_000_000)).deal).toMatchObject({ state: "NoDeal", price: null });
    expect((await runDeal(5_000_000, 4_000_000, 2)).deal).toMatchObject({ state: "Retry", round: 2 });
  });

  it("rejects a buyer with the wrong link token", async () => {
    const chain = new MockChain();
    const seller = mockClient(chain, "seller.test");
    const id = await seller.createDeal("Bike", "", await sha256("tok"), 1);
    await seller.submitLimit(id, encodeMockLimit(1), NO_COMMIT, null);

    await expect(
      mockClient(chain, "buyer.test").submitLimit(id, encodeMockLimit(2), NO_COMMIT, "wrong"),
    ).rejects.toThrow("link token");
  });
});

describe("routes", () => {
  it("parses the app routes", () => {
    expect(parseRoute("/")).toEqual({ name: "landing" });
    expect(parseRoute("/d/7")).toEqual({ name: "deal", id: 7 });
    expect(parseRoute("/d/7/join")).toEqual({ name: "join", id: 7 });
    expect(parseRoute("/nope")).toEqual({ name: "notFound" });
  });
});
