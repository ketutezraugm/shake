import { PublicKey } from "near-api-js";
import { HttpError } from "./errors.js";
import {
  CATEGORIES,
  PHOTO_TYPES,
  type Category,
  type CreateAccountReq,
  type CreateListingReq,
  type PhotoReq,
  type RegisterSlotsReq,
} from "./types.js";

export const MAX_PHOTOS = 4;
export const MAX_SLOTS = 10;

const bytes = (text: string) => new TextEncoder().encode(text).length;
const bad = (message: string) => new HttpError(400, message);

function record(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw bad("body must be a JSON object");
  return body as Record<string, unknown>;
}

export function parseCategory(value: unknown): Category {
  if (!CATEGORIES.includes(value as Category)) throw bad(`category must be one of ${CATEGORIES.join(", ")}`);
  return value as Category;
}

export function parseCreateListing(body: unknown): CreateListingReq {
  const { title, description, category, maxRounds } = record(body);
  // Same bounds as the contract's create_deal, so a listing can always be backed by deals.
  if (typeof title !== "string" || bytes(title) < 1 || bytes(title) > 100) throw bad("title must be 1-100 bytes");
  if (typeof description !== "string" || bytes(description) > 1000) throw bad("description must be at most 1000 bytes");
  if (!Number.isInteger(maxRounds) || (maxRounds as number) < 1 || (maxRounds as number) > 3) {
    throw bad("maxRounds must be 1, 2 or 3");
  }
  return { title, description, category: parseCategory(category), maxRounds: maxRounds as number };
}

export function parseSlots(body: unknown): RegisterSlotsReq {
  const { slots } = record(body);
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > MAX_SLOTS) {
    throw bad(`slots must be a list of 1-${MAX_SLOTS}`);
  }
  const seen = new Set<number>();
  for (const slot of slots) {
    const { dealId, linkToken } = record(slot);
    if (!Number.isSafeInteger(dealId) || (dealId as number) < 0) throw bad("dealId must be a non-negative integer");
    if (typeof linkToken !== "string" || linkToken.length < 1 || linkToken.length > 128) throw bad("bad linkToken");
    if (seen.has(dealId as number)) throw bad("duplicate dealId");
    seen.add(dealId as number);
  }
  return { slots: slots as RegisterSlotsReq["slots"] };
}

// Same rule as the profiles.handle check in migration 0002.
const HANDLE = /^[a-z0-9](-?[a-z0-9]){1,31}$/;

export function parseCreateAccount(body: unknown): CreateAccountReq {
  const { handle, publicKey } = record(body);
  if (typeof handle !== "string" || !HANDLE.test(handle)) throw bad("handle must be 2-32 lowercase letters, digits or single dashes");
  try {
    if (typeof publicKey !== "string" || PublicKey.fromString(publicKey).keyType !== 0) throw new Error();
  } catch {
    throw bad("publicKey must be an ed25519 key");
  }
  return { handle, publicKey: publicKey as string };
}

export function parsePhotoReq(body: unknown): PhotoReq {
  const { contentType } = record(body);
  if (!PHOTO_TYPES.includes(contentType as PhotoReq["contentType"])) throw bad("contentType must be jpeg, png or webp");
  return { contentType: contentType as PhotoReq["contentType"] };
}
