import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

let client: SupabaseClient | undefined;

/** Undefined until VITE_SUPABASE_* are set; the sign-in screen says so instead of failing on a bad URL. */
export const authConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function supabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  client ??= createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

// Both flows come back to /signin, where the screen finishes the sign-in.
const redirectTo = () => `${location.origin}/signin`;

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function sendEmailLink(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw new Error(`Could not send the link: ${error.message}`);
}

/** The access token of the current Supabase login, or null when nobody is signed in (or the link is still being read). */
export async function accessToken(): Promise<string | null> {
  if (!authConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOutOfSupabase(): Promise<void> {
  if (authConfigured) await supabase().auth.signOut();
}
