import { KeyPair } from "near-api-js";
import { describe, expect, it, vi } from "vitest";
import { connectWallet, loadWalletSession, walletSigner, type WalletLike } from "./walletSigner";

const chain = { contractId: "blind-deal-59xtyh4b.testnet", rpcUrl: "https://rpc.example" };
const FEE = 2_100_000_000_000_000_000_000n;

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

function fakeWallet(accountId = "alice.testnet") {
  const sent: { receiverId: string; actions: unknown[] }[] = [];
  const wallet: WalletLike = {
    getAccounts: async () => [{ accountId }],
    signAndSendTransaction: async (params) => {
      sent.push(params as { receiverId: string; actions: unknown[] });
      return {} as never;
    },
  };
  return { wallet, sent };
}

describe("connectWallet", () => {
  it("asks the wallet for a function-call key on the deal contract that cannot take money", async () => {
    const { wallet } = fakeWallet();
    const connect = vi.fn(async () => wallet);
    const storage = memoryStorage();

    const session = await connectWallet({ connect }, chain, storage);

    const params = (connect.mock.calls[0] as unknown as [{ addFunctionCallKey: Record<string, unknown> }])[0];
    expect(params.addFunctionCallKey).toMatchObject({
      contractId: chain.contractId,
      publicKey: KeyPair.fromString(session.secretKey as `ed25519:${string}`).getPublicKey().toString(),
      allowMethods: { anyMethod: false },
      gasAllowance: { kind: "limited", amount: "1000000000000000000000000" },
    });
    const methods = (params.addFunctionCallKey.allowMethods as { methodNames: string[] }).methodNames;
    expect(methods).toContain("create_deal");
    expect(methods).toContain("submit_limit");
    expect(methods).not.toContain("deposit"); // a deposit needs the wallet's own approval
    expect(session.accountId).toBe("alice.testnet");
  });

  it("keeps the session in the browser so a reload does not ask the wallet again", async () => {
    const storage = memoryStorage();
    const session = await connectWallet({ connect: async () => fakeWallet().wallet }, chain, storage);

    expect(loadWalletSession(storage)).toEqual(session);
  });
});

describe("walletSigner.call", () => {
  const key = KeyPair.fromRandom("ed25519").toString();

  it("signs calls without a deposit with the function-call key, so no popup", async () => {
    const { wallet, sent } = fakeWallet();
    const viaKey = vi.fn(async () => 42);
    const base = { accountId: "alice.testnet", signRequest: async () => ({}), call: viaKey };
    const signer = walletSigner({ accountId: "alice.testnet", secretKey: key }, async () => wallet, chain, base);

    const result = await signer.call("create_deal", { title: "t" });

    expect(result).toBe(42);
    expect(viaKey).toHaveBeenCalledWith("create_deal", { title: "t" });
    expect(sent).toHaveLength(0);
  });

  it("sends calls that attach money through the wallet, with the exact deposit", async () => {
    const { wallet, sent } = fakeWallet();
    const signer = walletSigner({ accountId: "alice.testnet", secretKey: key }, async () => wallet, chain);

    await signer.call("submit_limit", { deal_id: 7 }, FEE);

    expect(sent).toEqual([
      {
        network: "testnet",
        signerId: "alice.testnet",
        receiverId: chain.contractId,
        actions: [
          {
            type: "FunctionCall",
            params: { methodName: "submit_limit", args: { deal_id: 7 }, gas: "300000000000000", deposit: FEE.toString() },
          },
        ],
      },
    ]);
  });

  it("signs relayer requests with the function-call key", async () => {
    const pair = KeyPair.fromRandom("ed25519");
    const { wallet } = fakeWallet();
    const signer = walletSigner({ accountId: "alice.testnet", secretKey: pair.toString() }, async () => wallet, chain);

    const headers = await signer.signRequest("PUT", "/me/profile", "{}");

    expect(headers["x-account-id"]).toBe("alice.testnet");
    expect(headers["x-public-key"]).toBe(pair.getPublicKey().toString());
  });
});
