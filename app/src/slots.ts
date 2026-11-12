import type { ContractClient } from "./contract";
import { sealLimit } from "./crypto";
import type { Signer } from "./signer";
import type { SlotInput } from "../../relayer/src/types";

/** A seller lists once; each slot is a pre-made deal a buyer can claim, so the seller can stay offline. */

const minimumKey = (listingId: string) => `blind-deal:minimum:${listingId}`;

type StoredMinimum = { limit: string };

/** The seller's sealed minimum for a listing, kept only in the browser that listed it; null on any other device. */
export function storedMinimum(listingId: string): string | null {
  const stored = localStorage.getItem(minimumKey(listingId));
  return stored ? (JSON.parse(stored) as StoredMinimum).limit : null;
}

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<number[]> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// The relayer checks the deal on chain right after we submit; an RPC node that is a block behind answers "not
// yours" or "not waiting" for a deal that is fine. A live run hit this once, so retry those two briefly.
const CHAIN_LAG = /is not yours|must be waiting/;
const ATTEMPTS = 5;
const RETRY_MS = 1500;

async function registerSlot(relayerUrl: string, listingId: string, signer: Signer, slot: SlotInput): Promise<void> {
  const path = `/listings/${listingId}/slots`;
  const body = JSON.stringify({ slots: [slot] });
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(relayerUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json", ...(await signer.signRequest("POST", path, body)) },
      body,
    });
    if (response.ok) return;
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.status === 400 && CHAIN_LAG.test(error ?? "") && attempt < ATTEMPTS) {
      await sleep(RETRY_MS);
      continue;
    }
    throw new Error(`relayer refused the slot (${response.status}): ${error ?? "no reason given"}`);
  }
}

export type CreateSlotsOptions = {
  listingId: string;
  count: number;
  minimum: string;
  maxRounds: number;
  signer: Signer;
  client: ContractClient;
  teePubkey: string;
  relayerUrl: string;
  onProgress?: (done: number, total: number) => void;
};

/**
 * Makes `count` deals for a listing: create, seal the seller's minimum into round 1, register with the relayer.
 * Sequential (one key, one nonce) and registered one by one, so a failure leaves a usable listing with fewer slots.
 */
export async function createSlots(options: CreateSlotsOptions): Promise<SlotInput[]> {
  // The minimum never leaves this browser except sealed to the TEE; resubmitSeller and addSlots need it later.
  localStorage.setItem(minimumKey(options.listingId), JSON.stringify({ limit: options.minimum } satisfies StoredMinimum));
  return makeSlots(options);
}

export type AddSlotsOptions = Omit<CreateSlotsOptions, "minimum">;

/**
 * "Add more offer slots" on a listing whose slots are all claimed. Uses the seller's current minimum from this
 * browser (lowered by resubmitSeller if they lowered it), so old and new slots never carry different floors.
 * The relayer refuses more than 10 slots per listing.
 */
export async function addSlots(options: AddSlotsOptions): Promise<SlotInput[]> {
  const stored = localStorage.getItem(minimumKey(options.listingId));
  if (!stored) throw new Error("open this on the device you listed from: the minimum is only kept there");
  return makeSlots({ ...options, minimum: (JSON.parse(stored) as StoredMinimum).limit });
}

async function makeSlots(options: CreateSlotsOptions): Promise<SlotInput[]> {
  const { listingId, count, minimum, maxRounds, signer, client, teePubkey, relayerUrl, onProgress } = options;
  const slots: SlotInput[] = [];
  for (let i = 0; i < count; i++) {
    const linkToken = randomToken();
    const dealId = await client.createDeal(`listing:${listingId}`, "", await sha256(linkToken), maxRounds);
    const sealed = await sealLimit(dealId, "seller", 1, minimum, teePubkey);
    await client.submitLimit(dealId, sealed.ct, sealed.commit, null);
    const slot = { dealId, linkToken };
    await registerSlot(relayerUrl, listingId, signer, slot);
    slots.push(slot);
    onProgress?.(i + 1, count);
  }
  return slots;
}
export type ResubmitOptions = {
  listingId: string;
  dealId: number;
  round: number;
  limit: string;
  client: ContractClient;
  teePubkey: string;
};

/** Answers "Round N requested": the seller's limit may stay or fall, never rise (the TEE would end the deal). */
export async function resubmitSeller(options: ResubmitOptions): Promise<void> {
  const { listingId, dealId, round, limit, client, teePubkey } = options;
  const stored = localStorage.getItem(minimumKey(listingId));
  if (stored && BigInt(limit) > BigInt((JSON.parse(stored) as StoredMinimum).limit)) {
    throw new Error("the limit can stay the same or go lower, not higher");
  }
  const sealed = await sealLimit(dealId, "seller", round, limit, teePubkey);
  await client.submitLimit(dealId, sealed.ct, sealed.commit, null);
  localStorage.setItem(minimumKey(listingId), JSON.stringify({ limit } satisfies StoredMinimum));
}
