import { PHOTO_TYPES, type Category, type Listing, type PhotoRes, type PhotoType } from "../../relayer/src/types";
import type { ContractClient } from "./contract";
import type { Signer } from "./signer";
import { createSlots } from "./slots";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // the storage bucket's limit
const MAX_SLOTS = 10;
const U64_MAX = 2n ** 64n - 1n;

export type PublishInput = {
  title: string;
  description: string;
  category: Category;
  maxRounds: number;
  /** Whole Rupiah as digits; it only ever leaves this browser sealed to the TEE. */
  minimum: string;
  photos: Blob[];
  slotCount: number;
  signer: Signer;
  client: ContractClient;
  teePubkey: string;
  relayerUrl: string;
  onProgress?: (step: PublishStep) => void;
};

export type PublishStep =
  | { stage: "listing" }
  | { stage: "photos" | "slots"; done: number; total: number };

const byteLength = (text: string) => new TextEncoder().encode(text).length;
const isPhotoType = (type: string): type is PhotoType => (PHOTO_TYPES as readonly string[]).includes(type);

/** Checks everything the relayer and contract would refuse, so the seller finds out before any request or fee. */
function validate(input: PublishInput): void {
  const titleBytes = byteLength(input.title.trim());
  if (titleBytes < 1 || titleBytes > 100) throw new Error("Add a title of up to 100 bytes");
  if (byteLength(input.description) > 1000) throw new Error("The description can be at most 1000 bytes");
  if (!Number.isInteger(input.maxRounds) || input.maxRounds < 1 || input.maxRounds > 3) {
    throw new Error("Choose 1 to 3 rounds");
  }
  if (!/^[1-9]\d*$/.test(input.minimum) || BigInt(input.minimum) > U64_MAX) {
    throw new Error("Enter the minimum price as whole Rupiah, digits only");
  }
  if (input.photos.length > MAX_PHOTOS) throw new Error(`Add up to ${MAX_PHOTOS} photos`);
  for (const photo of input.photos) {
    if (!isPhotoType(photo.type)) throw new Error("Photos must be JPEG, PNG or WebP");
    if (photo.size > MAX_PHOTO_BYTES) throw new Error("Each photo must be 2 MB or smaller");
  }
  if (!Number.isInteger(input.slotCount) || input.slotCount < 1 || input.slotCount > MAX_SLOTS) {
    throw new Error(`Make between 1 and ${MAX_SLOTS} offer slots`);
  }
}

async function signedPost<T>(relayerUrl: string, signer: Signer, path: string, payload: object, what: string): Promise<T> {
  const body = JSON.stringify(payload);
  const response = await fetch(relayerUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(await signer.signRequest("POST", path, body)) },
    body,
  }).catch(() => {
    throw new Error(`${what} failed: could not reach the relayer`);
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(`${what} failed: ${error ?? `relayer answered ${response.status}`}`);
  }
  return (await response.json()) as T;
}

async function uploadPhoto(relayerUrl: string, signer: Signer, listingId: string, photo: Blob): Promise<void> {
  const target = await signedPost<PhotoRes>(relayerUrl, signer, `/listings/${listingId}/photos`, { contentType: photo.type }, "Photo upload");
  const put = await fetch(target.uploadUrl, { method: "PUT", headers: { "content-type": photo.type }, body: photo });
  if (!put.ok) throw new Error(`Photo upload failed: storage answered ${put.status}`);
}

/**
 * Sell flow: create the listing, upload photos, then make the on-chain offer slots.
 * Returns the listing id. If a later step fails the listing stays, with what was finished so far.
 */
export async function publishListing(input: PublishInput): Promise<string> {
  validate(input);
  const { signer, relayerUrl, onProgress } = input;

  onProgress?.({ stage: "listing" });
  const listing = await signedPost<Listing>(
    relayerUrl,
    signer,
    "/listings",
    { title: input.title.trim(), description: input.description.trim(), category: input.category, maxRounds: input.maxRounds },
    "Creating the listing",
  );

  for (const [i, photo] of input.photos.entries()) {
    onProgress?.({ stage: "photos", done: i, total: input.photos.length });
    await uploadPhoto(relayerUrl, signer, listing.id, photo);
  }

  await createSlots({
    listingId: listing.id,
    count: input.slotCount,
    minimum: input.minimum,
    maxRounds: input.maxRounds,
    signer,
    client: input.client,
    teePubkey: input.teePubkey,
    relayerUrl,
    onProgress: (done, total) => onProgress?.({ stage: "slots", done, total }),
  });
  return listing.id;
}
