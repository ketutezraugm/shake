import type { NearConnector } from "@hot-labs/near-connect";
import { setCurrentAccount } from "./accounts";
import { chain } from "./config";
import { RelayerError, signedGet, signedPut } from "./relayer";
import type { Profile } from "../../relayer/src/types";
import { keySigner } from "./signer";
import { connectWallet, type WalletSession } from "./walletSigner";

let connector: NearConnector | undefined;

/** Loaded on first use, so the wallet list and its code are fetched only when someone taps "Connect NEAR wallet". */
async function walletConnector(): Promise<NearConnector> {
  if (!connector) {
    const { NearConnector } = await import("@hot-labs/near-connect");
    connector = new NearConnector({ network: "testnet" });
  }
  return connector;
}

export async function getWallet() {
  return (await walletConnector()).wallet();
}

/** Wallet sign-in: the wallet adds a limited key for this app, and the account becomes the signed-in one. */
export async function signInWithWallet(): Promise<WalletSession> {
  const session = await connectWallet(await walletConnector(), chain);
  setCurrentAccount(session.accountId);
  return session;
}

/** The shop this wallet account already opened, or null for a first sign-in. */
export async function fetchMyProfile(relayerUrl: string, session: WalletSession): Promise<Profile | null> {
  const signer = keySigner(session.accountId, session.secretKey, chain);
  try {
    return await signedGet<Profile>(relayerUrl, signer, "/me/profile", "loading your shop");
  } catch (e) {
    if (e instanceof RelayerError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Creates the wallet user's shop. A user who already has a profile keeps its handle and the relayer rewrites the
 * other fields, so this is for the first sign-in only.
 */
export function createWalletProfile(relayerUrl: string, session: WalletSession, handle: string): Promise<Profile> {
  const signer = keySigner(session.accountId, session.secretKey, chain);
  return signedPut(relayerUrl, signer, "/me/profile", { handle, displayName: handle, bio: "", city: "", avatarUrl: null }, "creating your shop");
}

/** Drops the wallet connection, also one restored after a reload; the stored limited key goes with the session. */
export async function disconnectWallet(): Promise<void> {
  await (await walletConnector()).disconnect().catch(() => undefined);
}
