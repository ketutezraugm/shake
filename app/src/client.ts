import { chain as chainConfig, teePubkey as realTeePubkey } from "./config";
import type { ContractClient, Deal } from "./contract";
import { exportSecretKey } from "./keys";
import { MOCK_TEE_PUBLIC_KEY, MockChain, mockClient, mockSigner } from "./mockClient";
import { nearClient } from "./nearClient";
import { keySigner, type Signer } from "./signer";
import { getWallet } from "./wallet";
import { loadWalletSession, walletSigner } from "./walletSigner";

// Until M1-11 swaps in testnet, the mock chain lives on the dev server (vite.config.ts) so any browser can join a deal.
const STORE_URL = "/__mock-chain";

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

  // Load before every call and save only when the call changed something. A read can change things too: it is where
  // a finished "computing" step lands, and the answer is derived from the deal, so two tabs settle it the same way.
  const synced = {} as Record<string, unknown>;
  for (const [name, method] of Object.entries(client) as [string, (...args: unknown[]) => Promise<unknown>][]) {
    synced[name] = async (...args: unknown[]) => {
      chain.restore(await readDeals());
      const before = JSON.stringify(chain.dump());
      const result = await method(...args);
      const after = chain.dump();
      if (JSON.stringify(after) !== before) await writeDeals(after);
      return result;
    };
  }
  return synced as unknown as ContractClient;
}

export type ChainAccess = { signer: Signer; client: ContractClient; teePubkey: string };

/**
 * What a screen needs to act as `accountId`: the real contract and a signer when VITE_CONTRACT_ID is set (a wallet user's limited key and payment popups, or the browser key),
 * otherwise the shared dev-server mock chain. Same `Signer` and `ContractClient` either way, so screens never branch.
 */
export function chainFor(accountId: string): ChainAccess {
  if (chainConfig.contractId) {
    const wallet = loadWalletSession();
    const signer = wallet?.accountId === accountId ? walletSigner(wallet, getWallet, chainConfig) : keySigner(accountId, exportSecretKey(), chainConfig);
    return { signer, client: nearClient(signer, chainConfig), teePubkey: realTeePubkey ?? "" };
  }
  // Requests carry real signatures even on the mock chain, so a local relayer (npm run dev:relayer) can check them.
  const signRequest: Signer["signRequest"] = (method, path, body) => keySigner(accountId, exportSecretKey(), chainConfig).signRequest(method, path, body);
  return { signer: { ...mockSigner(accountId), signRequest }, client: clientFor(accountId), teePubkey: MOCK_TEE_PUBLIC_KEY };
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
