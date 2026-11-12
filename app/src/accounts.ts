import { chain } from "./config";
import { signedGet, signedPut, RelayerError } from "./relayer";
import { keySigner, type Signer } from "./signer";
import { clearWalletSession, type WalletSession } from "./walletSigner";

const ACCOUNT_KEY = "blind-deal:account";
const HANDLE_KEY = "blind-deal:handle";
const VIEWER_KEY = "blind-deal:viewer";

// Same rule as the relayer (validate.ts), so the screen never offers a handle the relayer would refuse.
const HANDLE = /^[a-z0-9](-?[a-z0-9]){1,31}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE.test(handle);
}

export function currentAccount(storage: Storage = localStorage): string | null {
  return storage.getItem(ACCOUNT_KEY);
}

/** The shop handle of the signed-in account; wallet account ids carry no handle, so it is stored beside the id. */
export function currentHandle(storage: Storage = localStorage): string | null {
  return storage.getItem(HANDLE_KEY);
}

export function saveAccount(accountId: string, handle: string, storage: Storage = localStorage): void {
  storage.setItem(ACCOUNT_KEY, accountId);
  storage.setItem(HANDLE_KEY, handle);
}

/** A Google/email login browses only; it holds no NEAR account, so buying and selling need a wallet. */
export function markViewer(storage: Storage = localStorage): void {
  storage.setItem(VIEWER_KEY, "1");
}

/** none: signed out. viewer: Google/email, browse only. trader: a NEAR wallet account with a shop handle. */
export type Access = "none" | "viewer" | "trader";

export function currentAccess(storage: Storage = localStorage): Access {
  if (currentAccount(storage)) return "trader";
  return storage.getItem(VIEWER_KEY) ? "viewer" : "none";
}

/** The handle of an account, or null when it has no profile yet (a wallet user's first visit). */
export async function handleOf(relayerUrl: string, signer: Signer): Promise<string | null> {
  try {
    return (await signedGet<{ handle: string }>(relayerUrl, signer, "/me/profile", "Sign in")).handle;
  } catch (error) {
    if (error instanceof RelayerError && error.status === 404) return null;
    throw error;
  }
}

/** A wallet user picks the shop handle once; the relayer ignores it on later calls. */
export async function claimHandle(relayerUrl: string, signer: Signer, handle: string): Promise<string> {
  const profile = { handle, displayName: "", bio: "", city: "", avatarUrl: null };
  const saved = await signedPut<{ handle: string }>(relayerUrl, signer, "/me/profile", profile, "Saving your handle");
  saveAccount(signer.accountId, saved.handle);
  return saved.handle;
}

/** After a wallet connects: the account's handle, or null when its owner still has to pick one. */
export async function finishWalletSignIn(relayerUrl: string, session: WalletSession, storage: Storage = localStorage): Promise<string | null> {
  const handle = await handleOf(relayerUrl, keySigner(session.accountId, session.secretKey, chain));
  if (handle) saveAccount(session.accountId, handle, storage);
  return handle;
}

export function signOut(storage: Storage = localStorage): void {
  storage.removeItem(ACCOUNT_KEY);
  storage.removeItem(HANDLE_KEY);
  storage.removeItem(VIEWER_KEY);
  clearWalletSession(storage);
}
