import { createHash } from "node:crypto";
import { PublicKey } from "near-api-js";
import { HttpError } from "./errors.js";
import type { NearReader } from "./near.js";

export const MAX_SKEW_MS = 5 * 60 * 1000;
const KEY_CACHE_MS = 60 * 1000;
const ACCOUNT_ID = /^[a-z0-9._-]{2,64}$/;

/** The exact bytes a client signs; the app must build the same string. */
export function signingMessage(method: string, path: string, body: string, timestamp: string): Uint8Array {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return new TextEncoder().encode(`blind-deal-relayer:v1|${method}|${path}|${bodyHash}|${timestamp}`);
}

export type SignedRequest = {
  method: string;
  path: string;
  body: string;
  header: (name: string) => string | undefined;
};

/** Verifies a request signed by a key of the account it claims; returns that account. */
export function createAuthenticator(near: NearReader, now: () => number = Date.now) {
  const knownKeys = new Map<string, number>();

  async function ownsKey(accountId: string, publicKey: string): Promise<boolean> {
    const cacheKey = `${accountId}|${publicKey}`;
    const seen = knownKeys.get(cacheKey);
    if (seen !== undefined && now() - seen < KEY_CACHE_MS) return true;
    if (!(await near.hasAccessKey(accountId, publicKey))) return false;
    knownKeys.set(cacheKey, now());
    return true;
  }

  return async function authenticate(request: SignedRequest): Promise<string> {
    const accountId = request.header("x-account-id");
    const publicKey = request.header("x-public-key");
    const timestamp = request.header("x-timestamp");
    const signature = request.header("x-signature");
    if (!accountId || !publicKey || !timestamp || !signature) throw new HttpError(401, "missing auth headers");
    if (!ACCOUNT_ID.test(accountId)) throw new HttpError(401, "bad account id");
    if (!/^\d+$/.test(timestamp) || Math.abs(now() - Number(timestamp)) > MAX_SKEW_MS) {
      throw new HttpError(401, "timestamp outside the allowed window");
    }

    let valid: boolean;
    try {
      valid = PublicKey.fromString(publicKey).verify(
        signingMessage(request.method, request.path, request.body, timestamp),
        Buffer.from(signature, "base64"),
      );
    } catch {
      throw new HttpError(401, "malformed key or signature");
    }
    if (!valid) throw new HttpError(401, "bad signature");
    if (!(await ownsKey(accountId, publicKey))) throw new HttpError(401, "key does not belong to this account");
    return accountId;
  };
}
