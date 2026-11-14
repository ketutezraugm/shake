import { rpFromYocto } from "./format";
import { rowText, type OfferRow } from "./myOffers";
import type { ChainConfig } from "./signer";

const YOCTO_PER_NEAR = 10n ** 24n;

/** What the account menu counts from the buyer's deals in progress. `lockedRp` is grouped Rupiah digits. */
export type OfferTotals = { open: number; needYou: number; lockedRp: string };

export function offerTotals(rows: OfferRow[]): OfferTotals {
  let lockedYocto = 0n;
  for (const { view } of rows) if (view.kind === "funded" || view.kind === "refundable") lockedYocto += BigInt(view.price);
  return { open: rows.length, needYou: rows.filter((row) => rowText(row.view).yourMove).length, lockedRp: rpFromYocto(lockedYocto.toString()) };
}

/** A yoctoNEAR balance for people: two decimals, and "<0.01" rather than a misleading zero. */
export function formatNear(yocto: string): string {
  const amount = BigInt(yocto);
  if (amount > 0n && amount < YOCTO_PER_NEAR / 100n) return "<0.01 NEAR";
  const hundredths = amount / (YOCTO_PER_NEAR / 100n);
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, "0")} NEAR`;
}

/** The account's spendable NEAR, straight from the RPC node. */
export async function nearBalance(chain: ChainConfig, account: string): Promise<string> {
  const response = await fetch(chain.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "app", method: "query", params: { request_type: "view_account", finality: "optimistic", account_id: account } }),
  });
  if (!response.ok) throw new Error(`NEAR RPC answered ${response.status}`);
  const { result } = (await response.json()) as { result?: { amount?: string } };
  if (!result?.amount) throw new Error("balance unavailable");
  return formatNear(result.amount);
}
