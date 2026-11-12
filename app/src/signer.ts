import { Account, KeyPair, type KeyPairString } from "near-api-js";

export type ChainConfig = { contractId: string; rpcUrl: string };

/** One way to act as a NEAR account: a browser key (walletless) now, a wallet's function-call key later (MK-06). */
export interface Signer {
  accountId: string;
  /** Headers for a relayer request; the relayer checks them in relayer/src/auth.ts. */
  signRequest(method: string, path: string, body: string): Promise<Record<string, string>>;
  /** Calls a method on the deal contract and returns its parsed result; `depositYocto` is attached to the call. */
  call(method: string, args: object, depositYocto?: bigint): Promise<unknown>;
}

const GAS = 300_000_000_000_000n; // 300 Tgas; unused gas is refunded

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The walletless account: the browser's own full-access key signs everything. */
export function keySigner(accountId: string, secretKey: string, chain: ChainConfig): Signer {
  const key = KeyPair.fromString(secretKey as KeyPairString);
  const account = new Account(accountId, chain.rpcUrl, secretKey as KeyPairString);

  return {
    accountId,
    async signRequest(method, path, body) {
      const timestamp = String(Date.now());
      const message = `blind-deal-relayer:v1|${method}|${path}|${await sha256Hex(body)}|${timestamp}`;
      const { signature } = key.sign(new TextEncoder().encode(message));
      return {
        "x-account-id": accountId,
        "x-public-key": key.getPublicKey().toString(),
        "x-timestamp": timestamp,
        "x-signature": btoa(String.fromCharCode(...signature)),
      };
    },
    call: (methodName, args, deposit = 0n) =>
      account.callFunction({ contractId: chain.contractId, methodName, args, deposit, gas: GAS }),
  };
}
