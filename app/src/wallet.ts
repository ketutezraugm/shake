import type { NearConnector } from "@hot-labs/near-connect";
import { setCurrentAccount } from "./accounts";
import { chain } from "./config";
import { signedPut } from "./relayer";
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

/**
 * Creates the wallet user's shop. A user who already has a profile keeps its handle and the relayer rewrites the
 * other fields, so this is for the first sign-in only.
 */
export function createWalletProfile(relayerUrl: string, session: WalletSession, handle: string): Promise<Profile> {
  const signer = keySigner(session.accountId, session.secretKey, chain);
  return signedPut(relayerUrl, signer, "/me/profile", { handle, displayName: handle, bio: "", city: "", avatarUrl: null }, "creating your shop");
}

/** Drops the wallet connection if one was opened this page load; the stored limited key goes with the session. */
export async function disconnectWallet(): Promise<void> {
  await connector?.disconnect().catch(() => undefined);
}
