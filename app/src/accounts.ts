import { loadIdentity } from "./keys";
import { clearRole } from "./role";
import { clearWalletSession } from "./walletSigner";
import { RelayerError } from "./relayer";

const STORAGE_KEY = "blind-deal:account";
const HANDLE_KEY = "blind-deal:handle";
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

export function isHandleTaken(error: unknown): boolean {
  return error instanceof RelayerError && error.status === 409 && /handle is taken/.test(error.message);
}

export function saveHandle(handle: string, storage: Storage = localStorage): void {
  storage.setItem(HANDLE_KEY, handle);
}

/** A wallet account id says nothing about the shop handle chosen at sign-up, so the handle is stored beside it. */
export function currentHandle(storage: Storage = localStorage): string | null {
  const account = currentAccount(storage);
  return account && (storage.getItem(HANDLE_KEY) ?? account.split(".")[0] ?? null);
}

export function signOut(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(HANDLE_KEY);
  clearRole(storage);
  clearWalletSession(storage);
}
