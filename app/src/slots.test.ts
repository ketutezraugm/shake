import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractClient } from "./contract";
import type { Signer } from "./signer";
import { decrypt } from "eciesjs";
import vectors from "../../tee/testvectors.json";
import { addSlots, createSlots, resubmitSeller } from "./slots";

// A real compressed secp256k1 public key (the TEE test key); sealing needs a valid one.
const TEE_PUBKEY = "02466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27";
const MINIMUM = "4137000"; // distinctive so a leak into any request body is easy to spot

const signer: Signer = {
  accountId: "seller.testnet",
  signRequest: async () => ({ "x-account-id": "seller.testnet" }),
  call: async () => 0,
  send: async () => "",
};

function fakeClient() {
  let nextId = 100;
  const created: { dealId: number; linkHash: number[]; maxRounds: number }[] = [];
  const submitted: { dealId: number; linkToken: string | null }[] = [];
  const client = {
    createDeal: async (_t: string, _d: string, linkHash: number[], maxRounds: number) => {
      created.push({ dealId: nextId, linkHash, maxRounds });
      return nextId++;
    },
    submitLimit: async (dealId: number, _ct: number[], _c: number[], linkToken: string | null) => {
      submitted.push({ dealId, linkToken });
    },
  } as unknown as ContractClient;
  return { client, created, submitted };
}

const sha256 = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))];

// jsdom's Uint8Array is a different realm from Node's, which the crypto library rejects; a Map stands in for storage.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

let bodies: string[];
beforeEach(() => {
  store.clear();
  bodies = [];
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    bodies.push(String(init?.body));
    return new Response(JSON.stringify({ registered: 1 }), { status: 201 });
  });
});

describe("createSlots", () => {
  it("creates each deal, submits the seller's limit, and registers the deal with a token that opens it", async () => {
    const { client, created, submitted } = fakeClient();

    const slots = await createSlots({
      listingId: "11111111-1111-1111-1111-111111111111",
      count: 3,
      minimum: MINIMUM,
      maxRounds: 2,
      signer,
      client,
      teePubkey: TEE_PUBKEY,
      relayerUrl: "https://relayer.example",
    });

    expect(slots.map((s) => s.dealId)).toEqual([100, 101, 102]);
    expect(created.every((c) => c.maxRounds === 2)).toBe(true);
    expect(submitted.map((s) => s.dealId)).toEqual([100, 101, 102]);
    expect(submitted.every((s) => s.linkToken === null)).toBe(true);
    for (const [i, slot] of slots.entries()) {
      expect(await sha256(slot.linkToken)).toEqual(created[i]?.linkHash);
    }
    expect(bodies.map((b) => JSON.parse(b).slots[0].dealId)).toEqual([100, 101, 102]);
  });

  it("never sends the minimum to the relayer, and keeps it in the seller's browser", async () => {
    const { client } = fakeClient();
    const listingId = "22222222-2222-2222-2222-222222222222";

    await createSlots({
      listingId,
      count: 2,
      minimum: MINIMUM,
      maxRounds: 1,
      signer,
      client,
      teePubkey: TEE_PUBKEY,
      relayerUrl: "https://relayer.example",
    });

    expect(bodies.join("")).not.toContain(MINIMUM);
    expect(localStorage.getItem(`blind-deal:minimum:${listingId}`)).toContain(MINIMUM);
  });

  it("retries a registration the relayer refused only because its RPC node was a block behind", async () => {
    const answers = [
      new Response(JSON.stringify({ error: "deal 100 must be waiting for its buyer: submit the seller's limit first" }), { status: 400 }),
      new Response(JSON.stringify({ registered: 1 }), { status: 201 }),
    ];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return answers.shift()!;
    });
    const { client } = fakeClient();

    const done = createSlots({
      listingId: "66666666-6666-6666-6666-666666666666", count: 1, minimum: MINIMUM, maxRounds: 1, signer, client,
      teePubkey: TEE_PUBKEY, relayerUrl: "https://relayer.example",
    });

    await expect(done).resolves.toHaveLength(1);
    expect(bodies).toHaveLength(2);
  });

  it("does not retry a real refusal", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "wrong link token for deal 100" }), { status: 400 }));
    const { client } = fakeClient();

    await expect(
      createSlots({
        listingId: "77777777-7777-7777-7777-777777777777", count: 1, minimum: MINIMUM, maxRounds: 1, signer, client,
        teePubkey: TEE_PUBKEY, relayerUrl: "https://relayer.example",
      }),
    ).rejects.toThrow(/wrong link token/);
  });

  it("registers the slots it made when a later one fails, so the listing is still usable", async () => {
    const { client } = fakeClient();
    let calls = 0;
    const failing = { ...client, submitLimit: async () => { if (++calls === 2) throw new Error("rpc down"); } } as ContractClient;

    await expect(
      createSlots({
        listingId: "33333333-3333-3333-3333-333333333333",
        count: 3,
        minimum: MINIMUM,
        maxRounds: 1,
        signer,
        client: failing,
        teePubkey: TEE_PUBKEY,
        relayerUrl: "https://relayer.example",
      }),
    ).rejects.toThrow("rpc down");

    expect(bodies).toHaveLength(1);
  });
});

describe("resubmitSeller", () => {
  it("refuses a limit above the stored minimum, which the TEE would count as a no-deal", async () => {
    const { client } = fakeClient();
    const listingId = "44444444-4444-4444-4444-444444444444";
    await createSlots({
      listingId, count: 1, minimum: MINIMUM, maxRounds: 2, signer, client,
      teePubkey: TEE_PUBKEY, relayerUrl: "https://relayer.example",
    });

    await expect(
      resubmitSeller({ listingId, dealId: 100, round: 2, limit: "4200000", client, teePubkey: TEE_PUBKEY }),
    ).rejects.toThrow(/lower/);
  });

  it("submits the same or a lower limit for the next round and remembers it", async () => {
    const { client, submitted } = fakeClient();
    const listingId = "55555555-5555-5555-5555-555555555555";
    await createSlots({
      listingId, count: 1, minimum: MINIMUM, maxRounds: 2, signer, client,
      teePubkey: TEE_PUBKEY, relayerUrl: "https://relayer.example",
    });

    await resubmitSeller({ listingId, dealId: 100, round: 2, limit: "4000000", client, teePubkey: TEE_PUBKEY });

    expect(submitted.at(-1)).toEqual({ dealId: 100, linkToken: null });
    expect(localStorage.getItem(`blind-deal:minimum:${listingId}`)).toContain("4000000");
  });
});

describe("addSlots", () => {
  const relayerUrl = "https://relayer.example";

  it("adds slots sealed with the minimum stored when the listing was made", async () => {
    const listingId = "88888888-8888-8888-8888-888888888888";
    const { client } = fakeClient();
    await createSlots({ listingId, count: 1, minimum: MINIMUM, maxRounds: 1, signer, client, teePubkey: TEE_PUBKEY, relayerUrl });
    const sealed: number[][] = [];
    const recording = { ...client, submitLimit: async (_id: number, ct: number[]) => void sealed.push(ct) } as ContractClient;

    const added = await addSlots({ listingId, count: 2, maxRounds: 1, signer, client: recording, teePubkey: TEE_PUBKEY, relayerUrl });

    expect(added).toHaveLength(2);
    expect(sealed).toHaveLength(2);
    for (const ct of sealed) {
      const plain = JSON.parse(new TextDecoder().decode(decrypt(vectors.test_secret_key, Uint8Array.from(ct))));
      expect(plain.limit).toBe(MINIMUM);
    }
  });

  it("refuses on a device that does not hold the minimum, before any deal is made", async () => {
    const { client, created } = fakeClient();

    await expect(
      addSlots({ listingId: "99999999-9999-9999-9999-999999999999", count: 1, maxRounds: 1, signer, client, teePubkey: TEE_PUBKEY, relayerUrl }),
    ).rejects.toThrow(/device you listed from/);
    expect(created).toHaveLength(0);
  });
});
