import type { ContractClient, Deal, State } from "./contract";
import type { ChainConfig, Signer } from "./signer";

/** 0.0021 NEAR covers one OutLayer execution; the unused part is refunded to the caller. */
const OUTLAYER_FEE = 2_100_000_000_000_000_000_000n;

async function view<T>(chain: ChainConfig, method: string, args: object): Promise<T> {
  const response = await fetch(chain.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "app",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "optimistic",
        account_id: chain.contractId,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  if (!response.ok) throw new Error(`NEAR RPC answered ${response.status}`);
  const { result, error } = (await response.json()) as { result?: { result?: number[] }; error?: unknown };
  if (error || !result?.result) throw new Error(`${method} failed`);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result))) as T;
}

/** The deployed deal contract (docs/ARCHITECTURE.md) behind whichever signer the user signed in with. */
export function nearClient(signer: Signer, chain: ChainConfig): ContractClient {
  const getDeal = (dealId: number) => view<Deal | null>(chain, "get_deal", { deal_id: dealId });
  const call = (method: string, args: object, deposit?: bigint) => signer.call(method, args, deposit);

  return {
    async createDeal(title, description, linkHash, maxRounds) {
      return (await call("create_deal", {
        title,
        description,
        link_hash: linkHash,
        max_rounds: maxRounds,
      })) as number;
    },

    async submitLimit(dealId, ct, commit, linkToken) {
      const deal = await getDeal(dealId);
      if (!deal) throw new Error(`deal ${dealId} does not exist`);
      // The contract wants the fee on the call that completes the round and refuses it on any other.
      const otherSide = signer.accountId === deal.seller ? deal.buyer_cts : deal.seller_cts;
      const completesRound = otherSide.length === deal.round;
      await call(
        "submit_limit",
        { deal_id: dealId, ct, commit, link_token: linkToken },
        completesRound ? OUTLAYER_FEE : undefined,
      );
    },

    async deposit(dealId) {
      const deal = await getDeal(dealId);
      if (!deal?.price) throw new Error(`deal ${dealId} is not matched`);
      return signer.send("deposit", { deal_id: dealId }, BigInt(deal.price));
    },

    confirmReceived: (dealId) => signer.send("confirm_received", { deal_id: dealId }),
    async refund(dealId) {
      await call("refund", { deal_id: dealId });
    },
    async cancel(dealId) {
      await call("cancel", { deal_id: dealId });
    },
    async expire(dealId) {
      await call("expire", { deal_id: dealId });
    },

    getDeal,
    getState: (dealId) => view<State | null>(chain, "get_state", { deal_id: dealId }),
  };
}
