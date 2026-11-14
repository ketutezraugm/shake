import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Inbox } from "../../relayer/src/types";
import type { ContractClient } from "./contract";
import { answerQuestion, badgeCount, getInbox, getMessages, resubmitRound, sendMessage, splitInbox } from "./inbox";
import type { Signer } from "./signer";

// A real compressed secp256k1 public key (the TEE test key); sealing needs a valid one.
const TEE_PUBKEY = "02466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27";
const RELAYER = "http://relayer.test";

const signer: Signer = {
  accountId: "seller.testnet",
  signRequest: async (method, path) => ({ "x-account-id": "seller.testnet", "x-signed": `${method} ${path}` }),
  call: async () => 0,
  send: async () => "",
};

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

type Seen = { method: string; url: string; headers: Headers; body: unknown };

function stubRelayer(reply: Response) {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    seen.push({ method: init.method ?? "GET", url, headers: new Headers(init.headers), body: init.body ? JSON.parse(init.body as string) : undefined });
    return reply;
  });
  return seen;
}

const emptyInbox: Inbox = { questions: [], asked: [], roundsWaiting: [], matches: [], newMessages: [] };

describe("inbox reads", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the signed inbox and signs the path without its query", async () => {
    const seen = stubRelayer(Response.json(emptyInbox));

    await getInbox(RELAYER, signer, 12);

    expect(seen[0]?.url).toBe(`${RELAYER}/me/inbox?after=12`);
    expect(seen[0]?.headers.get("x-signed")).toBe("GET /me/inbox");
  });

  it("fetches a deal's messages after the last one seen", async () => {
    const seen = stubRelayer(Response.json([]));

    await getMessages(RELAYER, signer, 7, 3);

    expect(seen[0]?.url).toBe(`${RELAYER}/deals/7/messages?after=3`);
    expect(seen[0]?.headers.get("x-signed")).toBe("GET /deals/7/messages");
  });

  it("reports a refused read in words", async () => {
    stubRelayer(Response.json({ error: "chat opens after a deal" }, { status: 409 }));

    await expect(getMessages(RELAYER, signer, 7)).rejects.toThrow("Reading messages failed: chat opens after a deal");
  });

  it("counts everything waiting on the person for the badge", () => {
    const inbox: Inbox = {
      questions: [{ id: 1, listingId: "l", question: "q", answer: null, answeredAt: null, createdAt: "", listingTitle: "t" }],
      asked: [],
      roundsWaiting: [{ listingId: "l", title: "t", dealId: 1, round: 2 }],
      matches: [{ listingId: "l", title: "t", dealId: 1, role: "seller", counterparty: "b", state: "Matched" }],
      newMessages: [{ id: 1, dealId: 1, senderAccount: "b", body: "hi", createdAt: "" }],
    };

    expect(badgeCount(inbox)).toBe(3);
    expect(badgeCount(emptyInbox)).toBe(0);
  });
});

describe("inbox writes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts an answer to a question", async () => {
    const seen = stubRelayer(Response.json({ id: 4 }));

    await answerQuestion(RELAYER, signer, 4, " Ada, sudah difoto. ");

    expect(seen[0]?.url).toBe(`${RELAYER}/questions/4/answer`);
    expect(seen[0]?.body).toEqual({ answer: "Ada, sudah difoto." });
  });

  it("sends a chat message and refuses an empty one before any request", async () => {
    const seen = stubRelayer(Response.json({ id: 9 }));

    await sendMessage(RELAYER, signer, 7, "See you at 4");
    await expect(sendMessage(RELAYER, signer, 7, "   ")).rejects.toThrow("Type a message first");

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe(`${RELAYER}/deals/7/messages`);
    expect(seen[0]?.body).toEqual({ body: "See you at 4" });
  });
});

describe("resubmitRound", () => {
  beforeEach(() => {
    // The tests above unstub every global when they finish, storage included.
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    store.clear();
    store.set("blind-deal:minimum:l1", JSON.stringify({ limit: "4000000" }));
  });

  function fakeClient() {
    const submitted: { dealId: number; linkToken: string | null }[] = [];
    const client = {
      submitLimit: async (dealId: number, _ct: number[], _c: number[], linkToken: string | null) => void submitted.push({ dealId, linkToken }),
    } as unknown as ContractClient;
    return { client, submitted };
  }

  const options = (client: ContractClient, limit?: string) => ({ listingId: "l1", dealId: 7, round: 2, limit, client, teePubkey: TEE_PUBKEY });

  it("keeps the stored minimum when no new limit is given", async () => {
    const chain = fakeClient();

    await resubmitRound(options(chain.client));

    expect(chain.submitted).toEqual([{ dealId: 7, linkToken: null }]);
    expect(JSON.parse(store.get("blind-deal:minimum:l1") ?? "{}")).toEqual({ limit: "4000000" });
  });

  it("lowers the minimum when asked, and refuses to raise it", async () => {
    const chain = fakeClient();

    await resubmitRound(options(chain.client, "3800000"));
    await expect(resubmitRound(options(chain.client, "3900000"))).rejects.toThrow("not higher");

    expect(JSON.parse(store.get("blind-deal:minimum:l1") ?? "{}")).toEqual({ limit: "3800000" });
  });

  it("tells the seller to open the other device when this one has no minimum", async () => {
    store.clear();
    const chain = fakeClient();

    await expect(resubmitRound(options(chain.client))).rejects.toThrow("open this on the device you listed from");

    expect(chain.submitted).toHaveLength(0);
  });
});

describe("splitInbox", () => {
  const inbox: Inbox = {
    questions: [{ id: 1, listingId: "l1", question: "Still here?", answer: null, createdAt: "", answeredAt: null, listingTitle: "Camera" }],
    asked: [{ id: 5, listingId: "l2", question: "Is the frame steel?", answer: "Yes, steel.", createdAt: "", answeredAt: "", listingTitle: "Bike" }],
    roundsWaiting: [{ listingId: "l1", title: "Camera", dealId: 1, round: 2 }],
    matches: [
      { listingId: "l1", title: "Camera", dealId: 1, role: "seller", counterparty: "buyer.testnet", state: "Matched" },
      { listingId: "l2", title: "Bike", dealId: 2, role: "buyer", counterparty: "shop.testnet", state: "Matched" },
    ],
    newMessages: [
      { id: 10, dealId: 1, senderAccount: "buyer.testnet", body: "hi", createdAt: "" },
      { id: 11, dealId: 2, senderAccount: "shop.testnet", body: "hello", createdAt: "" },
    ],
  };

  it("keeps questions, rounds and seller chats for the shop", () => {
    const shop = splitInbox(inbox, "selling");
    expect(shop.questions).toHaveLength(1);
    expect(shop.asked).toEqual([]);
    expect(shop.roundsWaiting).toHaveLength(1);
    expect(shop.matches.map((m) => m.dealId)).toEqual([1]);
    expect(shop.newMessages.map((m) => m.dealId)).toEqual([1]);
  });

  it("keeps only buyer chats for /inbox", () => {
    const buying = splitInbox(inbox, "buying");
    expect(buying.questions).toEqual([]);
    expect(buying.asked.map((q) => q.answer)).toEqual(["Yes, steel."]);
    expect(buying.roundsWaiting).toEqual([]);
    expect(buying.matches.map((m) => m.dealId)).toEqual([2]);
    expect(buying.newMessages.map((m) => m.dealId)).toEqual([2]);
  });
});
