import { afterEach, describe, expect, it, vi } from "vitest";
import { walletBalance } from "./balance";

afterEach(() => vi.unstubAllGlobals());

describe("walletBalance", () => {
  it("asks the RPC for the account and returns its yoctoNEAR amount", async () => {
    let sent: { params?: Record<string, string> } = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body)) as typeof sent;
      return new Response(JSON.stringify({ result: { amount: "1250000000000000000000000" } }));
    });

    expect(await walletBalance("http://rpc.test", "alice.testnet")).toBe("1250000000000000000000000");
    expect(sent.params).toMatchObject({ request_type: "view_account", account_id: "alice.testnet" });
  });

  it("fails loudly for an account the RPC does not know", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: { name: "HANDLER_ERROR" } })));
    await expect(walletBalance("http://rpc.test", "ghost.testnet")).rejects.toThrow("ghost.testnet");
  });
});
