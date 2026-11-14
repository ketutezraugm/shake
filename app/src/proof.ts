// What the proof panel can honestly check in the browser: that each offer on the chain is the one this buyer made. The
// buyer's limit and salt are kept per round when the offer is sent, so the commitment can be recomputed and compared.
import type { Bytes32, Deal } from "./contract";
import { commitmentFor } from "./crypto";

/** SHA-256 of the sealed machine's compiled WASM; the key that opens offers is locked to this exact build (docs/DECISIONS.md). */
export const TEE_CODE_HASH = "789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904";

type Sealed = { limit: string; salt: string };

const sealedKey = (dealId: number, round: number) => `blind-deal:sealed:${dealId}:${round}`;

/** True when this browser sealed and submitted an offer for that round. */
export const hasSealed = (dealId: number, round: number): boolean => localStorage.getItem(sealedKey(dealId, round)) !== null;

export function rememberSealed(dealId: number, round: number, limit: string, salt: string): void {
  localStorage.setItem(sealedKey(dealId, round), JSON.stringify({ limit, salt } satisfies Sealed));
}

export type RoundProof = { round: number; status: "matches" | "differs" | "unavailable" };

const same = (a: Bytes32, b: Bytes32) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/** One result per round the buyer has sent. "unavailable" means this browser never saw that offer (another device). */
export async function checkOwnOffer(deal: Deal): Promise<RoundProof[]> {
  return Promise.all(
    deal.buyer_commits.map(async (onChain, index): Promise<RoundProof> => {
      const round = index + 1;
      const saved = localStorage.getItem(sealedKey(deal.id, round));
      if (!saved) return { round, status: "unavailable" };
      const { limit, salt } = JSON.parse(saved) as Sealed;
      const recomputed = await commitmentFor(deal.id, "buyer", round, limit, salt);
      return { round, status: same(recomputed, onChain) ? "matches" : "differs" };
    }),
  );
}

/** The first and last characters of a long hash, for a line of text; the full value stays selectable. */
export const shortHash = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-8)}`;

export const toHex = (bytes: Bytes32) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
