import { signOut } from "./accounts";
import { clearSession } from "./auth";
import { disconnectWallet } from "./wallet";
import { loadWalletSession } from "./walletSigner";

/** Clears every kind of login (stored account, Supabase session, wallet), whichever one the user came in with. */
export async function leave(): Promise<void> {
  const hadWallet = loadWalletSession() !== null; // signOut forgets it, and only wallet users have a connection to drop
  signOut();
  clearSession();
  if (hadWallet) await disconnectWallet();
}
