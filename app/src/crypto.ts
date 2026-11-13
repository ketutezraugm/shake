import { encrypt, PublicKey } from "eciesjs";
import type { Bytes32 } from "./contract";

export type Side = "seller" | "buyer";

/** What the contract stores for one limit: ciphertext and commitment, plus the salt the browser keeps. */
export type Sealed = { ct: number[]; commit: Bytes32; salt: string };

const U64_MAX = 18446744073709551615n;

/** Canonical decimal Rupiah, nonzero, fits u64: the TEE rejects anything else, so fail before paying a fee. */
function assertCanonicalLimit(limit: string): void {
  if (!/^[1-9][0-9]*$/.test(limit) || BigInt(limit) > U64_MAX) {
    throw new Error("limit must be a whole number of Rupiah above zero");
  }
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

/** The same string the TEE hashes (tee/src/commit.rs); tee/testvectors.json pins both sides. */
export async function commitmentFor(
  dealId: number,
  side: Side,
  round: number,
  limit: string,
  salt: string,
): Promise<Bytes32> {
  const canonical = `blind-deal:v1|${dealId}|${side}|${round}|${limit}|${salt}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)];
}

/** Whether `hex` is a secp256k1 public key that `sealLimit` can encrypt to. */
export function isTeePublicKey(hex: string): boolean {
  try {
    PublicKey.fromHex(hex);
    return true;
  } catch {
    return false;
  }
}

/** Encrypts one limit to the TEE's public key (hex) with a fresh salt. */
export async function sealLimit(
  dealId: number,
  side: Side,
  round: number,
  limit: string,
  teePubkey: string,
): Promise<Sealed> {
  assertCanonicalLimit(limit);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const plain = JSON.stringify({ deal_id: dealId, side, round, limit, salt });
  const ct = Array.from(encrypt(teePubkey, new TextEncoder().encode(plain)));
  return { ct, commit: await commitmentFor(dealId, side, round, limit, salt), salt };
}
