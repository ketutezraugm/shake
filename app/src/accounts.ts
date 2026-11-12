import { exportSecretKey, importSecretKey, loadIdentity } from "./keys";
import { RelayerError } from "./relayer";

const STORAGE_KEY = "blind-deal:account";
// Parent account name is not chosen yet (DECISIONS.md, App account); M1-11 swaps this mock for the relayer call.
const PARENT = "blind-deal.testnet";

const NAME = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
// The relayer's rule for a shop handle (validate.ts): 2-32 lowercase letters or digits, single dashes inside.
const HANDLE = /^[a-z0-9](-?[a-z0-9]){1,31}$/;

export function isValidName(name: string): boolean {
  return NAME.test(name);
}

export function isValidHandle(handle: string): boolean {
  return HANDLE.test(handle);
}

/** Two free-looking alternatives for a taken handle; they stay valid by dropping what would not fit. */
export function handleSuggestions(handle: string): string[] {
  return ["shop", "preloved"].map((word) => `${handle.slice(0, 31 - word.length)}-${word}`).filter(isValidHandle);
}

export function currentAccount(storage: Storage = localStorage): string | null {
  return storage.getItem(STORAGE_KEY);
}

export function setCurrentAccount(accountId: string, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, accountId);
}

/** Mock relayer: only the public key would leave the browser. */
export async function createAccount(name: string, storage: Storage = localStorage): Promise<string> {
  if (!isValidName(name)) throw new Error("use 1-32 lowercase letters, digits or dashes");
  loadIdentity(storage);
  const accountId = `${name}.${PARENT}`;
  setCurrentAccount(accountId, storage);
  return accountId;
}

/** Walletless sign-up: the Supabase login proves who is asking, and only this browser's public key is sent. */
export async function openAccount(relayerUrl: string, accessToken: string, handle: string, storage: Storage = localStorage): Promise<string> {
  const response = await fetch(`${relayerUrl}/accounts`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ handle, publicKey: loadIdentity(storage).publicKey }),
  }).catch(() => {
    throw new RelayerError("could not reach the relayer", 0);
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new RelayerError(error ?? `relayer answered ${response.status}`, response.status);
  }
  const { accountId } = (await response.json()) as { accountId: string };
  setCurrentAccount(accountId, storage);
  return accountId;
}

export function isHandleTaken(error: unknown): boolean {
  return error instanceof RelayerError && error.status === 409 && /handle is taken/.test(error.message);
}

/**
 * One string that moves an account to another device: "<account id>:<secret key>". The key alone cannot say which
 * account it belongs to, and the relayer never learns it.
 */
export function exportBackup(storage: Storage = localStorage): string {
  const account = currentAccount(storage);
  if (!account) throw new Error("sign in first");
  return `${account}:${exportSecretKey(storage)}`;
}

export function importBackup(backup: string, storage: Storage = localStorage): string {
  const text = backup.trim();
  const cut = text.indexOf(":");
  const account = text.slice(0, cut);
  // A bare secret key ("ed25519:...") has no account in front of it, so it would parse as the account "ed25519".
  if (cut < 1 || account === "ed25519" || !/^[a-z0-9._-]+$/.test(account)) throw new Error("that backup key looks incomplete");
  importSecretKey(text.slice(cut + 1), storage);
  setCurrentAccount(account, storage);
  return account;
}
