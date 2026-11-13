import { afterEach, describe, expect, it, vi } from "vitest";
import { getHistory, postReceipt } from "./receipts";
import type { Signer } from "./signer";

const signer: Signer = {
  accountId: "buyer.testnet",
  signRequest: async (method, path) => ({ "x-signed": `${method} ${path}` }),
  call: async () => 0,
  send: async () => "",
};

afterEach(() => vi.unstubAllGlobals());

describe("receipts", () => {
  it("posts the transaction hash to the deal's receipts, signed", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ dealId: 7 }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await postReceipt("https://relayer.test", signer, 7, { kind: "deposit", txHash: "H" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://relayer.test/deals/7/receipts");
    expect(init.headers).toMatchObject({ "x-signed": "POST /deals/7/receipts" });
    expect(JSON.parse(init.body as string)).toEqual({ kind: "deposit", txHash: "H" });
  });

  it("reads the history from the relayer", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify([{ dealId: 7 }])));
    expect(await getHistory("https://relayer.test", signer)).toEqual([{ dealId: 7 }]);
  });
});
