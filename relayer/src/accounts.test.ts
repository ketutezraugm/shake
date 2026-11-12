import { KeyPair } from "near-api-js";
import { beforeEach, describe, expect, it } from "vitest";
import { nearToYocto, type AccountCreator } from "./accounts.js";
import { createApp } from "./app.js";
import { FakeNear, FakeStore } from "./fakes.js";

const FUND = nearToYocto("0.1");

class FakeCreator implements AccountCreator {
  readonly parentId = "parent.test";
  readonly created: { accountId: string; publicKey: string; fund: bigint }[] = [];
  funds = nearToYocto("10");

  async balance() {
    return this.funds;
  }

  async create(accountId: string, publicKey: string, fund: bigint) {
    this.created.push({ accountId, publicKey, fund });
  }
}

let creator: FakeCreator;
let store: FakeStore;
let app: ReturnType<typeof createApp>;
const publicKey = () => KeyPair.fromRandom("ed25519").getPublicKey().toString();

function signUp(body: unknown, token: string | null = "token-ann", ip = "1.1.1.1") {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": ip };
  if (token) headers.authorization = `Bearer ${token}`;
  return app.request("/accounts", { method: "POST", headers, body: JSON.stringify(body) });
}

beforeEach(() => {
  creator = new FakeCreator();
  store = new FakeStore();
  const users: Record<string, string> = { "token-ann": "user-ann", "token-bob": "user-bob" };
  app = createApp({
    store,
    near: new FakeNear(),
    allowedOrigin: "http://localhost:5173",
    accounts: { creator, verifyJwt: async (token) => users[token] ?? null, fundYocto: FUND },
  });
});

describe("POST /accounts", () => {
  it("answers 401 without a valid login", async () => {
    expect((await signUp({ handle: "ann", publicKey: publicKey() }, null)).status).toBe(401);
    expect((await signUp({ handle: "ann", publicKey: publicKey() }, "forged")).status).toBe(401);
    expect(creator.created).toHaveLength(0);
  });

  it("creates handle.parent for the browser's key, funds it and saves the profile", async () => {
    const key = publicKey();
    const response = await signUp({ handle: "ann", publicKey: key });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ accountId: "ann.parent.test" });
    expect(creator.created).toEqual([{ accountId: "ann.parent.test", publicKey: key, fund: FUND }]);
    expect(store.profiles).toEqual([{ accountId: "ann.parent.test", handle: "ann", auth: "email", supabaseUserId: "user-ann" }]);
  });

  it("allows one account per login and one owner per handle", async () => {
    await signUp({ handle: "ann", publicKey: publicKey() });
    expect((await signUp({ handle: "ann2", publicKey: publicKey() })).status).toBe(409);
    expect((await signUp({ handle: "ann", publicKey: publicKey() }, "token-bob")).status).toBe(409);
    expect(creator.created).toHaveLength(1);
  });

  it("rejects a malformed handle or key", async () => {
    expect((await signUp({ handle: "Ann!", publicKey: publicKey() })).status).toBe(400);
    expect((await signUp({ handle: "ann", publicKey: "secp256k1:abc" })).status).toBe(400);
    expect((await signUp({ handle: "ann", publicKey: "nonsense" })).status).toBe(400);
  });

  it("answers 429 on the fourth call from one address within the hour", async () => {
    for (let i = 0; i < 3; i++) await signUp({ handle: "x", publicKey: "bad" }, "token-ann", "9.9.9.9");
    expect((await signUp({ handle: "ann", publicKey: publicKey() }, "token-ann", "9.9.9.9")).status).toBe(429);
  });

  it("answers 503 when the relayer balance is low", async () => {
    creator.funds = nearToYocto("0.1");
    expect((await signUp({ handle: "ann", publicKey: publicKey() })).status).toBe(503);
    expect(creator.created).toHaveLength(0);
  });
});

describe("GET /accounts/me", () => {
  const me = (token: string | null) =>
    app.request("/accounts/me", { headers: token ? { authorization: `Bearer ${token}` } : {} });

  it("answers 401 without a valid login", async () => {
    expect((await me(null)).status).toBe(401);
    expect((await me("forged")).status).toBe(401);
  });

  it("answers 404 until the login has an account, then its account id and handle", async () => {
    expect((await me("token-ann")).status).toBe(404);
    await signUp({ handle: "ann", publicKey: publicKey() });
    const response = await me("token-ann");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accountId: "ann.parent.test", handle: "ann" });
    expect((await me("token-bob")).status).toBe(404);
  });
});

describe("nearToYocto", () => {
  it("converts decimal NEAR exactly", () => {
    expect(nearToYocto("1")).toBe(10n ** 24n);
    expect(nearToYocto("0.1")).toBe(10n ** 23n);
    expect(() => nearToYocto("abc")).toThrow();
  });
});
