import { signOut } from "./accounts";
import { signOutOfSupabase } from "./auth";
import { disconnectWallet } from "./wallet";

/** Clears every kind of login (stored account, Supabase session, wallet), whichever one the user came in with. */
export async function leave(): Promise<void> {
  signOut();
  await Promise.all([signOutOfSupabase(), disconnectWallet()]);
}
