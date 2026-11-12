// Supabase Auth over its REST endpoints, so the app needs no client library. The anon key is used for sign-in only.

export type AuthConfig = { url: string; anonKey: string };
export type AuthSession = { accessToken: string; expiresAt: number };

const SESSION_KEY = "blind-deal:auth";

/** Sends a sign-in link; clicking it returns to `redirectTo` with the session in the URL fragment. */
export async function sendEmailLink(config: AuthConfig, email: string, redirectTo: string): Promise<void> {
  const response = await fetch(`${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: config.anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  }).catch(() => {
    throw new Error("could not send the link: no connection");
  });
  if (!response.ok) {
    const { msg, error_description } = (await response.json().catch(() => ({}))) as { msg?: string; error_description?: string };
    throw new Error(`could not send the link: ${msg ?? error_description ?? `status ${response.status}`}`);
  }
}

export function googleSignInUrl(config: AuthConfig, redirectTo: string): string {
  return `${config.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
}

/** The session Supabase puts after `#` when it sends the browser back; null when the fragment holds none. */
export function sessionFromHash(hash: string, now = Date.now()): AuthSession | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const expiresIn = Number(params.get("expires_in"));
  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) return null;
  return { accessToken, expiresAt: now + expiresIn * 1000 };
}

/** What Supabase reports in the fragment when the person cancels Google or the link expired. */
export function errorFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_description") ?? params.get("error");
}

export function saveSession(session: AuthSession, storage: Storage = localStorage): void {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** An expired session is dropped, so a stale token never reaches the relayer. */
export function loadSession(storage: Storage = localStorage, now = Date.now()): AuthSession | null {
  const saved = storage.getItem(SESSION_KEY);
  if (!saved) return null;
  const session = JSON.parse(saved) as AuthSession;
  if (session.expiresAt <= now) {
    storage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}
