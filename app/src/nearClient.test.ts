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

/** Each RPC read answers the next deal, the last one repeating: a node a block behind, then one that has caught up. */
function stubChainSequence(deals: Deal[]) {
  let reads = 0;
  vi.stubGlobal("fetch", async () => {
    const deal = deals[Math.min(reads++, deals.length - 1)];
    return new Response(JSON.stringify({ result: { result: [...new TextEncoder().encode(JSON.stringify(deal))] } }));
  });
  return () => reads;
}

/** Like the contract: a call that completes the round without the fee is refused. */
function feeCheckingSigner(accountId: string, completes: () => boolean) {
  const calls: { deposit: bigint | undefined }[] = [];
  const signer: Signer = {
    accountId,
    signRequest: async () => ({}),
    call: async (_method, _args, deposit) => {
      calls.push({ deposit });
      if (completes() && deposit === undefined) throw new Error("WebAssembly trap: An `unreachable` opcode was executed.");
      return 0;
    },
    send: async () => "TXHASH",
  };
  return { signer, calls };
}

describe("nearClient.submitLimit when the node's answer is a block behind", () => {
  // After OutLayer failed, the round is handed back: the seller resubmits, then the buyer does.
  const handedBack = { ...base, buyer: "buyer.testnet", seller_cts: [], seller_commits: [] };
  const sellerBackIn = { ...handedBack, seller_cts: [[1]], seller_commits: [[0]] };

  it("retries once with the fee when a fresh read shows the seller is already in", async () => {
    const reads = stubChainSequence([handedBack, sellerBackIn]);
    const { signer, calls } = feeCheckingSigner("buyer.testnet", () => true);

    await nearClient(signer, chain).submitLimit(7, [9], [3], null);

    expect(calls).toEqual([{ deposit: undefined }, { deposit: FEE }]);
    expect(reads()).toBe(2);
  });

  it("does not retry a refusal that a fresh read does not explain", async () => {
    stubChainSequence([sellerBackIn]);
    const { signer, calls } = feeCheckingSigner("buyer.testnet", () => true);
    const refuse = vi.spyOn(signer, "call").mockRejectedValue(new Error("only the deal's buyer can submit"));

    await expect(nearClient(signer, chain).submitLimit(7, [9], [3], null)).rejects.toThrow("only the deal's buyer can submit");
    expect(refuse).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([]);
  });
});

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
