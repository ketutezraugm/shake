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
/**
 * The call that completes a round makes the contract wait for OutLayer, which can outlast the node's 120 s limit.
 * The transaction is on the chain by then, so a timeout is not a failure: the screen then shows the round computing.
 */
const timedOut = (error: unknown): boolean => /time(d)?[ -]?out/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error));

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
      const read = async () => {
        const deal = await getDeal(dealId);
        if (!deal) throw new Error(`deal ${dealId} does not exist`);
        return deal;
      };
      // The contract wants the fee on the call that completes the round and refuses it on any other.
      const completes = (deal: Deal) => (signer.accountId === deal.seller ? deal.buyer_cts : deal.seller_cts).length === deal.round;
      const submit = (completesRound: boolean) =>
        call("submit_limit", { deal_id: dealId, ct, commit, link_token: linkToken }, completesRound ? OUTLAYER_FEE : undefined);

      const first = completes(await read());
      try {
        await submit(first);
      } catch (error) {
        if (timedOut(error)) return;
        // The node can answer a block behind, so the other side's submit may be missing from the read the fee was chosen from.
        // A refused call changes nothing on chain; read again and retry once only if that changes the fee. (A second stale read is not retried.)
        const again = await read().then(completes, () => first);
        if (again === first) throw error;
        await submit(again).catch((retried) => {
          if (!timedOut(retried)) throw retried;
        });
      }
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
