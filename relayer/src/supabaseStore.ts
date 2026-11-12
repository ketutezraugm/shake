import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./errors.js";
import type { SlotRow, Store } from "./store.js";
import type { Category, Listing, ListingStatus, Negotiation } from "./types.js";

const BUCKET = "listing-photos";
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const UNIQUE_VIOLATION = "23505";

type CardRow = {
  id: string;
  seller_account: string;
  title: string;
  description: string;
  category: Category;
  photo_paths: string[];
  max_rounds: number;
  status: ListingStatus;
  created_at: string;
  free_slots: number;
};

type NegotiationRow = {
  deal_id: number;
  link_token: string;
  listings: { id: string; title: string; seller_account: string };
};

export function supabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const photoUrl = (path: string) => `${url}/storage/v1/object/public/${BUCKET}/${path}`;

  const toListing = (row: CardRow): Listing => ({
    id: row.id,
    sellerAccount: row.seller_account,
    title: row.title,
    description: row.description,
    category: row.category,
    photoUrls: row.photo_paths.map(photoUrl),
    maxRounds: row.max_rounds,
    status: row.status,
    createdAt: row.created_at,
    freeSlots: row.free_slots,
  });

  // A database failure becomes a 500; the real message stays in the server log, not the response.
  function optional<T>(result: { data: T | null; error: { message: string } | null }): T | null {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }

  function check<T>(result: { data: T | null; error: { message: string } | null }): T {
    const data = optional(result);
    if (data === null) throw new Error("query returned no data");
    return data;
  }

  const card = (id: string) => db.from("listing_cards").select("*").eq("id", id).maybeSingle<CardRow>();

  return {
    async list({ q, category, before, limit }) {
      let query = db.from("listing_cards").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(limit);
      if (category) query = query.eq("category", category);
      if (before) query = query.lt("created_at", before);
      if (q) {
        // Commas and parentheses would end the or() filter early; wildcards are the caller's text, not patterns.
        const term = q.replace(/[%_,()*\\]/g, " ").trim();
        if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }
      return check(await query.returns<CardRow[]>()).map(toListing);
    },

    async get(id) {
      const row = optional(await card(id));
      return row ? toListing(row) : null;
    },

    async listBySeller(seller) {
      const rows = check(
        await db.from("listing_cards").select("*").eq("seller_account", seller).order("created_at", { ascending: false }).returns<CardRow[]>(),
      );
      return rows.map(toListing);
    },

    async create(seller, req) {
      const inserted = check(
        await db
          .from("listings")
          .insert({
            seller_account: seller,
            title: req.title,
            description: req.description,
            category: req.category,
            max_rounds: req.maxRounds,
          })
          .select("id")
          .single<{ id: string }>(),
      );
      return toListing(check(await card(inserted.id)));
    },

    async addPhoto(id, contentType) {
      const path = `${id}/${randomUUID()}.${EXTENSIONS[contentType]}`;
      const current = check(await db.from("listings").select("photo_paths").eq("id", id).single<{ photo_paths: string[] }>());
      check(await db.from("listings").update({ photo_paths: [...current.photo_paths, path] }).eq("id", id).select("id").single());
      const signed = check(await db.storage.from(BUCKET).createSignedUploadUrl(path));
      return { uploadUrl: signed.signedUrl, photoUrl: photoUrl(path) };
    },

    async addSlots(id, slots) {
      const { error } = await db
        .from("slots")
        .insert(slots.map((slot) => ({ listing_id: id, deal_id: slot.dealId, link_token: slot.linkToken })));
      if (error?.code === UNIQUE_VIOLATION) throw new HttpError(409, "a deal is already registered");
      if (error) throw new Error(error.message);
    },

    async slotsOf(id) {
      const rows = check(
        await db.from("slots").select("deal_id, buyer_account").eq("listing_id", id).order("id").returns<{ deal_id: number; buyer_account: string | null }[]>(),
      );
      return rows.map((row): SlotRow => ({ dealId: row.deal_id, buyerAccount: row.buyer_account }));
    },

    async claim(id, buyer) {
      const rows = check(await db.rpc("claim_slot", { p_listing: id, p_buyer: buyer })) as { deal_id: number; link_token: string }[];
      const slot = rows[0];
      return slot ? { dealId: slot.deal_id, linkToken: slot.link_token } : null;
    },

    async hasProfileForUser(supabaseUserId) {
      const row = optional(await db.from("profiles").select("account_id").eq("supabase_user_id", supabaseUserId).maybeSingle());
      return row !== null;
    },

    async handleTaken(handle) {
      return optional(await db.from("profiles").select("account_id").eq("handle", handle).maybeSingle()) !== null;
    },

    async createProfile(profile) {
      const { error } = await db.from("profiles").insert({
        account_id: profile.accountId,
        handle: profile.handle,
        auth: profile.auth,
        supabase_user_id: profile.supabaseUserId,
      });
      if (error?.code === UNIQUE_VIOLATION) throw new HttpError(409, "handle or login already has an account");
      if (error) throw new Error(error.message);
    },

    async negotiationsOf(buyer) {
      const rows = check(
        await db
          .from("slots")
          .select("deal_id, link_token, listings(id, title, seller_account)")
          .eq("buyer_account", buyer)
          .order("claimed_at", { ascending: false })
          .returns<NegotiationRow[]>(),
      );
      return rows.map(
        (row): Negotiation => ({
          listingId: row.listings.id,
          title: row.listings.title,
          sellerAccount: row.listings.seller_account,
          dealId: row.deal_id,
          linkToken: row.link_token,
        }),
      );
    },

    async setStatus(id, status, reservedDeal = null) {
      check(await db.from("listings").update({ status, reserved_deal_id: reservedDeal }).eq("id", id).select("id").single());
    },

    async reservedDealOf(id) {
      const row = check(await db.from("listings").select("reserved_deal_id").eq("id", id).single<{ reserved_deal_id: number | null }>());
      return row.reserved_deal_id;
    },
  };
}
