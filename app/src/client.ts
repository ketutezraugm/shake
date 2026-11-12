import type { ContractClient, Deal } from "./contract";
import { MockChain, mockClient } from "./mockClient";

// Until M1-11 swaps in testnet, the mock chain lives on the dev server (vite.config.ts) so any browser can join a deal.
const STORE_URL = "/__mock-chain";
const READS = new Set(["getDeal", "getState"]);

async function readDeals(): Promise<Deal[]> {
  const response = await fetch(STORE_URL);
  if (!response.ok) throw new Error("mock chain store unavailable: run the app with npm run dev");
  return (await response.json()) as Deal[];
}

async function writeDeals(deals: Deal[]): Promise<void> {
  await fetch(STORE_URL, { method: "PUT", body: JSON.stringify(deals) });
}

export function clientFor(accountId: string): ContractClient {
  const chain = new MockChain();
  const client = mockClient(chain, accountId);

  // Load before every call and save after writes only, so a poll never overwrites another browser's submit.
  const synced = {} as Record<string, unknown>;
  for (const [name, method] of Object.entries(client) as [string, (...args: unknown[]) => Promise<unknown>][]) {
    synced[name] = async (...args: unknown[]) => {
      chain.restore(await readDeals());
      const result = await method(...args);
      if (!READS.has(name)) await writeDeals(chain.dump());
      return result;
    };
  }
  return synced as unknown as ContractClient;
}

const linkKey = (dealId: number) => `blind-deal:link:${dealId}`;

/** The contract stores only the token's hash, so the seller's browser keeps the token to re-show the link. */
export function saveLinkToken(dealId: number, token: string): void {
  localStorage.setItem(linkKey(dealId), token);
}

export function loadLinkToken(dealId: number): string | null {
  return localStorage.getItem(linkKey(dealId));
}

export function newLinkToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
