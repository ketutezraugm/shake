// @vitest-environment jsdom
import { KeyPair } from "near-api-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimHandle, currentAccess, currentAccount, currentHandle, handleOf, isValidHandle, markViewer, signOut } from "./accounts";
import { keySigner } from "./signer";

const RELAYER = "http://relayer.test";
type Call = { url: string; init: RequestInit };
let calls: Call[];

function relayerAnswers(status: number, body: object) {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  });
}

beforeEach(() => {
  calls = [];
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("isValidHandle", () => {
  it("matches the relayer's rule: 2-32 lowercase letters and digits, single dashes inside", () => {
    for (const ok of ["ab", "dita-jogja", "a1", "x".repeat(32)]) expect(isValidHandle(ok)).toBe(true);
    for (const bad of ["a", "-ab", "ab-", "a--b", "Ab", "a.b", "x".repeat(33), ""]) expect(isValidHandle(bad)).toBe(false);
  });
});

describe("wallet users", () => {
  const signer = () => keySigner("alice.testnet", KeyPair.fromRandom("ed25519").toString(), { contractId: "c.testnet", rpcUrl: "http://rpc.test" });

  it("finds the handle of an account with a profile, null without one", async () => {
    relayerAnswers(200, { handle: "alice" });
    expect(await handleOf(RELAYER, signer())).toBe("alice");
    relayerAnswers(404, { error: "no profile yet" });
    expect(await handleOf(RELAYER, signer())).toBeNull();
  });

  it("claims the handle with a signed PUT and remembers it", async () => {
    relayerAnswers(200, { handle: "alice" });

    await claimHandle(RELAYER, signer(), "alice");

    const [call] = calls;
    expect(call?.init.method).toBe("PUT");
    expect(call?.url).toBe(`${RELAYER}/me/profile`);
    expect(JSON.parse(String(call?.init.body))).toMatchObject({ handle: "alice", displayName: "", avatarUrl: null });
    expect(currentAccount()).toBe("alice.testnet");
    expect(currentHandle()).toBe("alice");
  });
});

describe("currentAccess", () => {
  it("is none when signed out, viewer after a Google/email login, trader once a wallet account has a handle", async () => {
    expect(currentAccess()).toBe("none");
    markViewer();
    expect(currentAccess()).toBe("viewer");

    relayerAnswers(200, { handle: "alice" });
    await claimHandle(RELAYER, keySigner("alice.testnet", KeyPair.fromRandom("ed25519").toString(), { contractId: "c.testnet", rpcUrl: "http://rpc.test" }), "alice");
    expect(currentAccess()).toBe("trader");
  });
});

describe("signOut", () => {
  it("forgets the account, the handle, the viewer login and any wallet session", () => {
    localStorage.setItem("blind-deal:account", "alice.testnet");
    localStorage.setItem("blind-deal:handle", "alice");
    markViewer();
    localStorage.setItem("blind-deal:wallet-session", JSON.stringify({ accountId: "alice.testnet", secretKey: "ed25519:x" }));

    signOut();

    expect(currentAccess()).toBe("none");
    expect(currentHandle()).toBeNull();
    expect(localStorage.getItem("blind-deal:wallet-session")).toBeNull();
  });
});
