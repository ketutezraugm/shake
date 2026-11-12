import { KeyPair, PublicKey } from "near-api-js";
import { describe, expect, it } from "vitest";
import { keySigner } from "./signer";

const sha256Hex = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const chain = { contractId: "blind-deal-59xtyh4b.testnet", rpcUrl: "https://test.rpc.fastnear.com" };

describe("keySigner.signRequest", () => {
  it("signs the exact string the relayer verifies (relayer/src/auth.ts signingMessage)", async () => {
    const key = KeyPair.fromRandom("ed25519");
    const signer = keySigner("alice.testnet", key.toString(), chain);
    const body = '{"title":"Camera"}';

    const headers = await signer.signRequest("POST", "/listings", body);

    expect(headers["x-account-id"]).toBe("alice.testnet");
    expect(headers["x-public-key"]).toBe(key.getPublicKey().toString());
    const bodyHash = await sha256Hex(body);
    const message = new TextEncoder().encode(
      `blind-deal-relayer:v1|POST|/listings|${bodyHash}|${headers["x-timestamp"]}`,
    );
    const signature = Uint8Array.from(atob(headers["x-signature"] ?? ""), (c) => c.charCodeAt(0));
    expect(PublicKey.fromString(headers["x-public-key"] ?? "").verify(message, signature)).toBe(true);
  });

  it("puts only the public half of the key in the headers", async () => {
    const key = KeyPair.fromRandom("ed25519");
    const headers = await keySigner("alice.testnet", key.toString(), chain).signRequest("GET", "/me/listings", "");

    const secret = key.toString().replace(/^ed25519:/, "");
    expect(JSON.stringify(headers)).not.toContain(secret);
  });
});
