import { currentAccount, signOut } from "./accounts";
import { clearSession, emailOf, loadSession } from "./auth";
import { disconnectWallet } from "./wallet";

/** Clears every kind of login (stored account, Supabase session, wallet), whichever one the user came in with. */
export async function leave(): Promise<void> {
  signOut();
  clearSession();
  await disconnectWallet();
}

/** Who is signed in: a NEAR account (can sell and offer), or only a Google or email login (can browse and ask). */
export type Viewer = { kind: "wallet"; account: string } | { kind: "login"; token: string; label: string };

export function viewer(): Viewer | null {
  const account = currentAccount();
  if (account) return { kind: "wallet", account };
  const login = loadSession();
  return login ? { kind: "login", token: login.accessToken, label: emailOf(login.accessToken) ?? "Signed in" } : null;
}
