// @vitest-environment jsdom
import { KeyPair } from "near-api-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function chainForWithContract() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTRACT_ID", "deal.testnet");
  return (await import("./client")).chainFor;
}

const publicKeyOf = async (signer: { signRequest: (m: string, p: string, b: string) => Promise<Record<string, string>> }) =>
  (await signer.signRequest("GET", "/x", ""))["x-public-key"];

describe("chainFor on a real contract", () => {
  const walletKey = KeyPair.fromRandom("ed25519");
  const browserKey = KeyPair.fromRandom("ed25519");

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("blind-deal:key", browserKey.toString());
    localStorage.setItem("blind-deal:wallet-session", JSON.stringify({ accountId: "alice.testnet", secretKey: walletKey.toString() }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("signs a wallet user's requests with the wallet session's limited key", async () => {
    const { signer } = (await chainForWithContract())("alice.testnet");

    expect(await publicKeyOf(signer)).toBe(walletKey.getPublicKey().toString());
  });

  it("signs any other account with this browser's own key", async () => {
    const { signer } = (await chainForWithContract())("dita.parent.testnet");

    expect(await publicKeyOf(signer)).toBe(browserKey.getPublicKey().toString());
  });
});
