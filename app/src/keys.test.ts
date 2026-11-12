// @vitest-environment jsdom
import { KeyPair, type KeyPairString } from "near-api-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshKeysModule() {
  vi.resetModules();
  return import("./keys");
}

describe("keys", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("creates an ed25519 key on first use", async () => {
    const { loadIdentity } = await freshKeysModule();

    expect(loadIdentity().publicKey).toMatch(/^ed25519:[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it("keeps the same key across a reload", async () => {
    const before = (await freshKeysModule()).loadIdentity();
    const after = (await freshKeysModule()).loadIdentity();

    expect(after.publicKey).toBe(before.publicKey);
  });

  it("exports a secret key that restores the same public key", async () => {
    const { loadIdentity, exportSecretKey } = await freshKeysModule();
    const { publicKey } = loadIdentity();

    const restored = KeyPair.fromString(exportSecretKey() as KeyPairString);

    expect(restored.getPublicKey().toString()).toBe(publicKey);
  });

  it("never puts the secret key in an outgoing fetch body", async () => {
    const bodies: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response("{}");
    });
    const { loadIdentity, exportSecretKey } = await freshKeysModule();

    const identity = loadIdentity();
    await fetch("/accounts", { method: "POST", body: JSON.stringify({ name: "t1", ...identity }) });

    const secret = exportSecretKey().replace(/^ed25519:/, "");
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain(identity.publicKey);
    expect(bodies[0]).not.toContain(secret);
  });

  it("imports an exported key and becomes the same identity", async () => {
    const { loadIdentity, exportSecretKey, importSecretKey } = await freshKeysModule();
    const original = loadIdentity().publicKey;
    const secret = exportSecretKey();

    localStorage.clear();
    const imported = importSecretKey(`  ${secret}\n`);

    expect(imported.publicKey).toBe(original);
    expect(loadIdentity().publicKey).toBe(original);
  });

  it("refuses text that is not a key and keeps the current one", async () => {
    const { loadIdentity, importSecretKey } = await freshKeysModule();
    const before = loadIdentity().publicKey;

    expect(() => importSecretKey("hello")).toThrow("not a valid key");
    expect(loadIdentity().publicKey).toBe(before);
  });
});
