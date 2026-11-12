import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractClient } from "./contract";
import { publishListing, type PublishInput } from "./publish";
import type { Signer } from "./signer";

// A real compressed secp256k1 public key (the TEE test key); sealing needs a valid one.
const TEE_PUBKEY = "02466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27";
const MINIMUM = "4137000"; // distinctive so a leak into any request body is easy to spot
const ASKING = "5000000";
const RELAYER = "http://relayer.test";

const signer: Signer = {
  accountId: "seller.testnet",
  signRequest: async () => ({ "x-account-id": "seller.testnet" }),
  call: async () => 0,
};

// jsdom's Uint8Array is a different realm from Node's, which the crypto library rejects; a Map stands in for storage.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

function fakeClient() {
  let nextId = 100;
  const client = {
    createDeal: async () => nextId++,
    submitLimit: async () => {},
  } as unknown as ContractClient;
  return { client, dealsMade: () => nextId - 100 };
}

type Call = { method: string; url: string; body: unknown; contentType: string | null };

function fakeRelayer() {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    calls.push({ method: init.method ?? "GET", url, body: init.body, contentType: headers.get("content-type") });
    const path = url.replace(RELAYER, "");
    if (path === "/listings") return Response.json({ id: "listing-1" }, { status: 201 });
    if (path.endsWith("/photos")) return Response.json({ uploadUrl: "http://storage.test/put", photoUrl: "http://storage.test/p.jpg" });
    return Response.json({}, { status: init.method === "PUT" ? 200 : 201 });
  });
  return calls;
}

const photo = (type = "image/jpeg", size = 1000) => new File([new Uint8Array(size)], "p", { type });

function input(overrides: Partial<PublishInput> = {}): PublishInput {
  return {
    title: "Kamera Fujifilm",
    description: "Body only",
    category: "electronics",
    maxRounds: 2,
    askingPrice: ASKING,
    minimum: MINIMUM,
    photos: [photo(), photo("image/png"), photo("image/webp")],
    slotCount: 3,
    signer,
    client: fakeClient().client,
    teePubkey: TEE_PUBKEY,
    relayerUrl: RELAYER,
    ...overrides,
  };
}

describe("publishListing", () => {
  beforeEach(() => store.clear());

  it("creates the listing, uploads each photo, then makes the slots", async () => {
    const calls = fakeRelayer();
    const chain = fakeClient();
    const progress: string[] = [];

    const id = await publishListing(input({ client: chain.client, onProgress: (step) => progress.push(step.stage) }));

    expect(id).toBe("listing-1");
    expect(calls.map((c) => `${c.method} ${c.url.replace(RELAYER, "")}`)).toEqual([
      "POST /listings",
      "POST /listings/listing-1/photos",
      "PUT http://storage.test/put",
      "POST /listings/listing-1/photos",
      "PUT http://storage.test/put",
      "POST /listings/listing-1/photos",
      "PUT http://storage.test/put",
      "POST /listings/listing-1/slots",
      "POST /listings/listing-1/slots",
      "POST /listings/listing-1/slots",
    ]);
    expect(chain.dealsMade()).toBe(3);
    expect(progress).toContain("photos");
    expect(progress).toContain("slots");
  });

  it("uploads the photo with the content type it asked the relayer for", async () => {
    const calls = fakeRelayer();

    await publishListing(input({ photos: [photo("image/png")], slotCount: 1 }));

    const upload = calls.find((c) => c.method === "PUT");
    expect(upload?.contentType).toBe("image/png");
    expect(JSON.parse(calls[1]!.body as string)).toEqual({ contentType: "image/png" });
  });

  it("accepts a minimum equal to the asking price and sends the asking price with the listing", async () => {
    const calls = fakeRelayer();

    await publishListing(input({ minimum: ASKING, photos: [], slotCount: 1 }));

    expect(JSON.parse(calls[0]!.body as string)).toMatchObject({ askingPrice: ASKING });
  });

  it("never sends the minimum in a request body", async () => {
    const calls = fakeRelayer();

    await publishListing(input());

    const textBodies = calls.filter((c) => typeof c.body === "string").map((c) => c.body as string);
    expect(textBodies.length).toBeGreaterThan(0);
    for (const body of textBodies) expect(body).not.toContain(MINIMUM);
  });

  it.each([
    ["more than 4 photos", { photos: Array.from({ length: 5 }, () => photo()) }, "up to 4 photos"],
    ["a non-image file", { photos: [photo("application/pdf")] }, "JPEG, PNG or WebP"],
    ["a photo over 2 MB", { photos: [photo("image/jpeg", 2 * 1024 * 1024 + 1)] }, "2 MB"],
    ["a minimum above the asking price", { minimum: "5000001" }, "at or below the asking price"],
    ["a zero asking price", { askingPrice: "0" }, "asking price"],
    ["an asking price with a decimal", { askingPrice: "5000000.5" }, "asking price"],
    ["a zero minimum", { minimum: "0" }, "whole Rupiah"],
    ["a decimal minimum", { minimum: "1.5" }, "whole Rupiah"],
    ["a minimum with a comma", { minimum: "4,000" }, "whole Rupiah"],
    ["an empty title", { title: "  " }, "title"],
    ["4 rounds", { maxRounds: 4 }, "1 to 3 rounds"],
    ["no slots", { slotCount: 0 }, "slot"],
  ])("refuses %s before any request or fee", async (_name, overrides, message) => {
    const calls = fakeRelayer();
    const chain = fakeClient();

    await expect(publishListing(input({ client: chain.client, ...overrides }))).rejects.toThrow(message);

    expect(calls).toHaveLength(0);
    expect(chain.dealsMade()).toBe(0);
  });

  it("explains a network failure instead of showing the browser's message", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(publishListing(input())).rejects.toThrow("Creating the listing failed: could not reach the relayer");
  });

  it("says which step failed when the relayer refuses", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "slow down" }, { status: 429 }));

    await expect(publishListing(input())).rejects.toThrow("slow down");
  });
});
