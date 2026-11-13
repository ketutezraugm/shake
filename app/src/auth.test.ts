// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailOf, errorFromHash, googleSignInUrl, loadSession, saveSession, sendEmailLink, sessionFromHash } from "./auth";

const config = { url: "https://proj.supabase.co", anonKey: "anon-key" };

describe("auth", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("reads the session Supabase leaves in the URL fragment", () => {
    const session = sessionFromHash("#access_token=abc.def&expires_in=3600&token_type=bearer", 1_000);

    expect(session).toEqual({ accessToken: "abc.def", expiresAt: 1_000 + 3_600_000 });
  });

  it("finds no session in an empty or error fragment, and reports the error", () => {
    expect(sessionFromHash("")).toBeNull();
    expect(sessionFromHash("#error=access_denied&error_description=Access+denied")).toBeNull();
    expect(errorFromHash("#error=access_denied&error_description=Access+denied")).toBe("Access denied");
  });

  it("drops an expired session instead of handing out its token", () => {
    saveSession({ accessToken: "old", expiresAt: 500 });

    expect(loadSession(localStorage, 1_000)).toBeNull();
    expect(localStorage.getItem("blind-deal:auth")).toBeNull();
  });

  it("keeps a live session", () => {
    saveSession({ accessToken: "live", expiresAt: 5_000 });

    expect(loadSession(localStorage, 1_000)?.accessToken).toBe("live");
  });

  it("asks Supabase for a sign-in link that returns to the app", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}");
    });

    await sendEmailLink(config, "dita@example.com", "http://localhost:5173/signin");

    expect(calls[0]?.url).toBe("https://proj.supabase.co/auth/v1/otp?redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fsignin");
    expect((calls[0]?.init.headers as Record<string, string>).apikey).toBe("anon-key");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ email: "dita@example.com", create_user: true });
  });

  it("says why a link could not be sent", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ msg: "Email rate limit exceeded" }), { status: 429 }));

    await expect(sendEmailLink(config, "a@b.co", "http://x")).rejects.toThrow("could not send the link: Email rate limit exceeded");
  });

  it("builds the Google sign-in address", () => {
    expect(googleSignInUrl(config, "http://localhost:5173/signin")).toBe(
      "https://proj.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fsignin",
    );
  });

  it("reads the email from a login token and tolerates one that is not a JWT", () => {
    const token = `h.${btoa(JSON.stringify({ email: "dita@example.com" }))}.s`;
    expect(emailOf(token)).toBe("dita@example.com");
    expect(emailOf("stand-in")).toBeNull();
  });
});
