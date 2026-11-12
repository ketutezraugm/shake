import { KeyPair } from "near-api-js";
import { describe, expect, it } from "vitest";
import { MAX_SKEW_MS, createAuthenticator, signingMessage } from "./auth.js";
import { FakeNear } from "./fakes.js";

const NOW = 1_800_000_000_000;

function setup() {
  const near = new FakeNear();
  const key = KeyPair.fromRandom("ed25519");
  const publicKey = key.getPublicKey().toString();
  near.keys.add(`ann.test|${publicKey}`);
  const authenticate = createAuthenticator(near, () => NOW);

  function request(overrides: { body?: string; signedBody?: string; timestamp?: number; account?: string; signer?: KeyPair } = {}) {
    const body = overrides.body ?? "{}";
    const timestamp = String(overrides.timestamp ?? NOW);
    const signer = overrides.signer ?? key;
    const signature = Buffer.from(signer.sign(signingMessage("POST", "/listings", overrides.signedBody ?? body, timestamp)).signature).toString("base64");
    const headers: Record<string, string> = {
      "x-account-id": overrides.account ?? "ann.test",
      "x-public-key": signer.getPublicKey().toString(),
      "x-timestamp": timestamp,
      "x-signature": signature,
    };
    return { method: "POST", path: "/listings", body, header: (name: string) => headers[name] };
  }

  return { authenticate, request, near };
}

describe("authenticate", () => {
  it("returns the account for a valid signature from one of its keys", async () => {
    const { authenticate, request } = setup();
    expect(await authenticate(request())).toBe("ann.test");
  });

  it("rejects a body changed after signing", async () => {
    const { authenticate, request } = setup();
    await expect(authenticate(request({ body: '{"x":2}', signedBody: '{"x":1}' }))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a stale timestamp", async () => {
    const { authenticate, request } = setup();
    await expect(authenticate(request({ timestamp: NOW - MAX_SKEW_MS - 1 }))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a valid signature from a key the account does not hold", async () => {
    const { authenticate, request } = setup();
    await expect(authenticate(request({ signer: KeyPair.fromRandom("ed25519") }))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects a key used for a different account", async () => {
    const { authenticate, request } = setup();
    await expect(authenticate(request({ account: "bob.test" }))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects missing headers", async () => {
    const { authenticate } = setup();
    await expect(authenticate({ method: "POST", path: "/listings", body: "", header: () => undefined })).rejects.toMatchObject({ status: 401 });
  });
});
