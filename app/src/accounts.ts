import { loadIdentity } from "./keys";

const STORAGE_KEY = "blind-deal:account";
// Parent account name is not chosen yet (DECISIONS.md, App account); M1-11 swaps this mock for the relayer call.
const PARENT = "blind-deal.testnet";

const NAME = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function isValidName(name: string): boolean {
  return NAME.test(name);
}

export function currentAccount(storage: Storage = localStorage): string | null {
  return storage.getItem(STORAGE_KEY);
}

/** Mock relayer: only the public key would leave the browser. */
export async function createAccount(name: string, storage: Storage = localStorage): Promise<string> {
  if (!isValidName(name)) throw new Error("use 1-32 lowercase letters, digits or dashes");
  loadIdentity(storage);
  const accountId = `${name}.${PARENT}`;
  storage.setItem(STORAGE_KEY, accountId);
  return accountId;
}
