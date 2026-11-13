import { afterEach, describe, expect, it, vi } from "vitest";
import { rpcNearReader } from "./near.js";

const CONTRACT = "deal.testnet";
const HASH = "A".repeat(44);

function stubTx(over: { signer?: string; receiver?: string; args?: string; status?: object } = {}) {
  const args = over.args ?? JSON.stringify({ deal_id: 5 });
  const result = {
    status: over.status ?? { SuccessValue: "" },
    transaction: {
      signer_id: over.signer ?? "buyer.testnet",
      receiver_id: over.receiver ?? CONTRACT,
      actions: [{ FunctionCall: { method_name: "deposit", args: Buffer.from(args).toString("base64"), deposit: "30" } }],
    },
  };
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ result })));
}

const reader = () => rpcNearReader("https://rpc.test", CONTRACT);

afterEach(() => vi.unstubAllGlobals());

describe("rpcNearReader.getTx", () => {
  it("returns the call when the caller signed it", async () => {
    stubTx();
    expect(await reader().getTx(HASH, "buyer.testnet")).toEqual({ signer: "buyer.testnet", methodName: "deposit", dealId: 5, depositYocto: "30", success: true });
  });

  it("returns null for a transaction someone else signed, whatever sender the node was asked about", async () => {
    stubTx({ signer: "seller.testnet" });
    expect(await reader().getTx(HASH, "buyer.testnet")).toBeNull();
  });

  it("returns null for a transaction to another contract", async () => {
    stubTx({ receiver: "other.testnet" });
    expect(await reader().getTx(HASH, "buyer.testnet")).toBeNull();
  });

  it("returns null instead of throwing when the arguments are not JSON", async () => {
    stubTx({ args: "not json" });
    expect(await reader().getTx(HASH, "buyer.testnet")).toBeNull();
  });

  it("reports a failed transaction as not successful", async () => {
    stubTx({ status: { Failure: {} } });
    expect((await reader().getTx(HASH, "buyer.testnet"))?.success).toBe(false);
  });
});
