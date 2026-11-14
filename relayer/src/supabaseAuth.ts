import { createClient } from "@supabase/supabase-js";

/** Returns the Supabase user id for an access token, or null when the token is not valid. */
export type JwtVerifier = (token: string) => Promise<string | null>;

/** Asks Supabase Auth whether the access token is valid, so the relayer never handles the JWT secret. */
export function supabaseJwtVerifier(url: string, serviceKey: string): JwtVerifier {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  return async (token) => {
    const { data, error } = await db.auth.getUser(token);
    return error ? null : (data.user?.id ?? null);
  };
}
