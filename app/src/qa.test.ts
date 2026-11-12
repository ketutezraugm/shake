import { afterEach, describe, expect, it, vi } from "vitest";
import { askAssistant, askSeller } from "./qa";
import type { Signer } from "./signer";

const RELAYER = "http://relayer.test";

const signer: Signer = {
  accountId: "buyer.testnet",
  signRequest: async (method, path) => ({ "x-account-id": "buyer.testnet", "x-signed": `${method} ${path}` }),
  call: async () => 0,
};

type Seen = { url: string; headers: Headers; body: unknown };

function stubRelayer(reply: Response) {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, headers: new Headers(init.headers), body: JSON.parse(init.body as string) });
    return reply;
  });
  return seen;
}

describe("askAssistant", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts a signed question and returns the answer", async () => {
    const seen = stubRelayer(Response.json({ answer: "The listing says 8k." }));

    const reply = await askAssistant(RELAYER, signer, "l1", "Shutter count?");

    expect(reply).toEqual({ answer: "The listing says 8k." });
    expect(seen[0]?.url).toBe(`${RELAYER}/assistant`);
    expect(seen[0]?.body).toEqual({ listingId: "l1", question: "Shutter count?" });
    expect(seen[0]?.headers.get("x-signed")).toBe("POST /assistant");
  });

  it("returns unknown when the assistant does not have the answer", async () => {
    stubRelayer(Response.json({ unknown: true }));

    expect(await askAssistant(RELAYER, signer, "l1", "Comes with the box?")).toEqual({ unknown: true });
  });

  it.each([429, 503])("falls back to unknown when the assistant answers %i (rate limit or no key)", async (status) => {
    stubRelayer(Response.json({ error: "try later" }, { status }));

    expect(await askAssistant(RELAYER, signer, "l1", "Anything?")).toEqual({ unknown: true });
  });

  it("still reports other failures in words", async () => {
    stubRelayer(Response.json({ error: "broken" }, { status: 500 }));

    await expect(askAssistant(RELAYER, signer, "l1", "Anything?")).rejects.toThrow("Asking the assistant failed: broken");
  });
});

describe("askSeller", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the question to the listing's public questions", async () => {
    const seen = stubRelayer(Response.json({ id: 7, listingId: "l1", question: "Box?", answer: null }, { status: 201 }));

    await askSeller(RELAYER, signer, "l1", "Box?");

    expect(seen[0]?.url).toBe(`${RELAYER}/listings/l1/questions`);
    expect(seen[0]?.body).toEqual({ question: "Box?" });
    expect(seen[0]?.headers.get("x-signed")).toBe("POST /listings/l1/questions");
  });

  it("refuses an empty question before any request", async () => {
    const seen = stubRelayer(Response.json({}));

    await expect(askSeller(RELAYER, signer, "l1", "   ")).rejects.toThrow("Type a question first");

    expect(seen).toHaveLength(0);
  });
});
