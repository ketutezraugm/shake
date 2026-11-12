/** The account's spendable balance in yoctoNEAR, read straight from the RPC (no key needed). */
export async function walletBalance(rpcUrl: string, accountId: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "app",
      method: "query",
      params: { request_type: "view_account", finality: "final", account_id: accountId },
    }),
  });
  if (!response.ok) throw new Error(`NEAR RPC answered ${response.status}`);
  const { result, error } = (await response.json()) as { result?: { amount?: string }; error?: unknown };
  if (error || !result?.amount) throw new Error(`could not read the balance of ${accountId}`);
  return result.amount;
}
