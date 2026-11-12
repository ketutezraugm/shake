// Optimistic reads are enough here: the contract re-checks every rule when the deal is actually used.
export type ChainDeal = {
  id: number;
  seller: string;
  buyer: string | null;
  link_hash: number[];
  max_rounds: number;
  round: number;
  state: string;
  /** Set when the deal matched; a NoDeal that still has it is an expired match. */
  matched_at_ns?: number | null;
};

export interface NearReader {
  getDeal(dealId: number): Promise<ChainDeal | null>;
  hasAccessKey(accountId: string, publicKey: string): Promise<boolean>;
}

type RpcResponse = { result?: Record<string, unknown>; error?: unknown };

export function rpcNearReader(rpcUrl: string, contractId: string): NearReader {
  async function query(params: Record<string, unknown>): Promise<RpcResponse> {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "relayer", method: "query", params: { finality: "optimistic", ...params } }),
    });
    if (!response.ok) throw new Error(`NEAR RPC answered ${response.status}`);
    return (await response.json()) as RpcResponse;
  }

  return {
    async getDeal(dealId) {
      const args = Buffer.from(JSON.stringify({ deal_id: dealId })).toString("base64");
      const { result, error } = await query({
        request_type: "call_function",
        account_id: contractId,
        method_name: "get_deal",
        args_base64: args,
      });
      if (error || !result || !Array.isArray(result.result)) throw new Error("get_deal failed");
      return JSON.parse(Buffer.from(result.result as number[]).toString()) as ChainDeal | null;
    },

    async hasAccessKey(accountId, publicKey) {
      const { result, error } = await query({ request_type: "view_access_key", account_id: accountId, public_key: publicKey });
      const failure = JSON.stringify(error ?? result?.error ?? "");
      if (failure.includes("UNKNOWN_ACCESS_KEY") || failure.includes("does not exist")) return false;
      if (error || !result || result.error) throw new Error("view_access_key failed");
      return true;
    },
  };
}
