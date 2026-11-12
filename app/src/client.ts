import type { ContractClient } from "./contract";
import { MockChain, mockClient } from "./mockClient";

// One in-memory chain per tab until M1-11 swaps in the testnet client; it resets on reload.
const chain = new MockChain();

export function clientFor(accountId: string): ContractClient {
  return mockClient(chain, accountId);
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
