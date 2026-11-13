// Optimistic reads are enough here: the contract re-checks every rule when the deal is actually used.
export type ChainDeal = {
  id: number;
  seller: string;
  buyer: string | null;
  link_hash: number[];
  max_rounds: number;
  round: number;
  state: string;
  /** Sealed limits submitted so far, one per round; the seller owes round N while this has fewer than N. */
  seller_cts?: unknown[];
  /** Set when the deal matched; a NoDeal that still has it is an expired match. */
  matched_at_ns?: number | null;
  /** yoctoNEAR as a decimal string, set once the deal matched. */
  price?: string | null;
};

/** A finalized transaction to the deal contract; the reader returns null for any other receiver. */
export type ChainTx = { signer: string; methodName: string; dealId: number | null; depositYocto: string; success: boolean };

export interface NearReader {
  getDeal(dealId: number): Promise<ChainDeal | null>;
  hasAccessKey(accountId: string, publicKey: string): Promise<boolean>;
  /** The transaction `hash` sent by `signer` to the deal contract, or null when there is no such transaction. */
  getTx(hash: string, signer: string): Promise<ChainTx | null>;
}

type RawTx = {
  status: Record<string, unknown>;
  transaction: { signer_id: string; receiver_id: string; actions: { FunctionCall?: { method_name: string; args: string; deposit: string } }[] };
};

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

    async getTx(hash, signer) {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "relayer", method: "tx", params: { tx_hash: hash, sender_account_id: signer, wait_until: "FINAL" } }),
      });
      if (!response.ok) throw new Error(`NEAR RPC answered ${response.status}`);
      const { result, error } = (await response.json()) as { result?: RawTx; error?: unknown };
      if (JSON.stringify(error ?? "").includes("UNKNOWN_TRANSACTION")) return null;
      if (error || !result) throw new Error("tx lookup failed");
      const { transaction, status } = result;
      const call = transaction.actions.length === 1 ? transaction.actions[0]?.FunctionCall : undefined;
      // The node answers for any sender_account_id, so the signer is checked here, not trusted from the request.
      if (transaction.signer_id !== signer || transaction.receiver_id !== contractId || !call) return null;
      let args: { deal_id?: unknown };
      try {
        args = JSON.parse(Buffer.from(call.args, "base64").toString() || "{}") as { deal_id?: unknown };
      } catch {
        return null;
      }
      return {
        signer: transaction.signer_id,
        methodName: call.method_name,
        dealId: typeof args.deal_id === "number" ? args.deal_id : null,
        depositYocto: call.deposit,
        success: "SuccessValue" in status,
      };
    },
  };
}
