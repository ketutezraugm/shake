import { afterEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "./contract";
import { nearClient } from "./nearClient";
import type { Signer } from "./signer";

const FEE = 2_100_000_000_000_000_000_000n;
const chain = { contractId: "blind-deal-1wxklib7.testnet", rpcUrl: "https://rpc.example" };

const base: Deal = {
  id: 7,
  seller: "seller.testnet",
  buyer: null,
  title: "t",
  description: "",
  link_hash: [],
  max_rounds: 2,
  round: 1,
  seller_cts: [[1]],
  buyer_cts: [],
  seller_commits: [[0]],
  buyer_commits: [],
  state: "Waiting",
  price: null,
  matched_at_ns: null,
  deadline_ns: null,
  matcher_retries: 0,
};

/** Answers `get_deal` over a stubbed RPC like the real node does: result bytes are the JSON, as a number array. */
function stubChain(deal: Deal | null) {
  vi.stubGlobal("fetch", async () => {
    const bytes = [...new TextEncoder().encode(JSON.stringify(deal))];
    return new Response(JSON.stringify({ result: { result: bytes } }));
  });
}

function recordingSigner(accountId: string) {
  const calls: { method: string; args: object; deposit: bigint | undefined }[] = [];
  const signer: Signer = {
    accountId,
    signRequest: async () => ({}),
    call: async (method, args, deposit) => {
      calls.push({ method, args, deposit });
      return 0;
    },
    send: async (method, args, deposit) => {
      calls.push({ method, args, deposit });
      return "TXHASH";
    },
  };
  return { signer, calls };
}

afterEach(() => vi.unstubAllGlobals());

describe("nearClient.submitLimit attaches the OutLayer fee only on the call that completes the round", () => {
  it("buyer joining a waiting deal completes round 1, so the fee is attached", async () => {
    stubChain(base);
    const { signer, calls } = recordingSigner("buyer.testnet");

    await nearClient(signer, chain).submitLimit(7, [9], [3], "token");

    expect(calls).toEqual([
      { method: "submit_limit", args: { deal_id: 7, ct: [9], commit: [3], link_token: "token" }, deposit: FEE },
    ]);
  });

  it("seller's first submit does not complete the round, so nothing is attached", async () => {
    stubChain({ ...base, seller_cts: [], seller_commits: [], state: "Created" });
    const { signer, calls } = recordingSigner("seller.testnet");

    await nearClient(signer, chain).submitLimit(7, [9], [3], null);

    expect(calls[0]?.deposit).toBeUndefined();
  });

  it("in round 2 the side that goes second pays: seller after the buyer attaches the fee", async () => {
    stubChain({
      ...base,
      buyer: "buyer.testnet",
      round: 2,
      state: "Retry",
      seller_cts: [[1]],
      buyer_cts: [[2], [4]],
    });
    const { signer, calls } = recordingSigner("seller.testnet");

    await nearClient(signer, chain).submitLimit(7, [9], [3], null);

    expect(calls[0]?.deposit).toBe(FEE);
  });
});

describe("nearClient.deposit", () => {
  it("attaches exactly the matched price", async () => {
    stubChain({ ...base, state: "Matched", price: "42000000000000000000000" });
    const { signer, calls } = recordingSigner("buyer.testnet");

    await nearClient(signer, chain).deposit(7);

    expect(calls).toEqual([{ method: "deposit", args: { deal_id: 7 }, deposit: 42_000_000_000_000_000_000_000n }]);
  });

  it("resolves with the transaction hash, and so does confirmReceived", async () => {
    stubChain({ ...base, state: "Matched", price: "42000000000000000000000" });
    const { signer } = recordingSigner("buyer.testnet");
    const client = nearClient(signer, chain);

    expect(await client.deposit(7)).toBe("TXHASH");
    expect(await client.confirmReceived(7)).toBe("TXHASH");
  });

  it("refuses when the deal has no price yet", async () => {
    stubChain(base);
    const { signer } = recordingSigner("buyer.testnet");

    await expect(nearClient(signer, chain).deposit(7)).rejects.toThrow(/matched/);
  });
});
