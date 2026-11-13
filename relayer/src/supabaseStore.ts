import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./errors.js";
import type { SlotRow, Store } from "./store.js";
import type { Category, Listing, ListingStatus, Message, Negotiation, Profile, Question, Receipt } from "./types.js";

const BUCKET = "listing-photos";
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const UNIQUE_VIOLATION = "23505";

type CardRow = {
  id: string;
  seller_account: string;
  seller_handle: string | null;
  title: string;
  description: string;
  category: Category;
  photo_paths: string[];
  max_rounds: number;
  asking_price: number;
  status: ListingStatus;
  reserved_deal_id: number | null;
  created_at: string;
  free_slots: number;
};

type NegotiationRow = {
  deal_id: number;
  link_token: string;
  listings: { id: string; title: string; seller_account: string };
};

type ProfileRow = { account_id: string; handle: string; display_name: string; avatar_url: string | null; bio: string; city: string };
type QuestionRow = {
  id: number;
  listing_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};
type ReceiptRow = { deal_id: number; kind: Receipt["kind"]; tx_hash: string; signer_account: string; amount_yocto: string; recorded_at: string };

const toReceipt = (row: ReceiptRow): Receipt => ({
  dealId: row.deal_id,
  kind: row.kind,
  txHash: row.tx_hash,
  signerAccount: row.signer_account,
  amountYocto: String(row.amount_yocto),
  recordedAt: row.recorded_at,
});

type MessageRow = { id: number; deal_id: number; sender_account: string; body: string; created_at: string };

const PROFILE_COLUMNS = "account_id, handle, display_name, avatar_url, bio, city";
const QUESTION_COLUMNS = "id, listing_id, question, answer, answered_at, created_at";
const RECEIPT_COLUMNS = "deal_id, kind, tx_hash, signer_account, amount_yocto, recorded_at";
const MESSAGE_COLUMNS = "id, deal_id, sender_account, body, created_at";

const toProfile = (row: ProfileRow): Profile => ({
  handle: row.handle,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  city: row.city,
});

const toQuestion = (row: QuestionRow): Question => ({
  id: row.id,
  listingId: row.listing_id,
  question: row.question,
  answer: row.answer,
  answeredAt: row.answered_at,
  createdAt: row.created_at,
});

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  dealId: row.deal_id,
  senderAccount: row.sender_account,
  body: row.body,
  createdAt: row.created_at,
});

export function supabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const photoUrl = (path: string) => `${url}/storage/v1/object/public/${BUCKET}/${path}`;

  const toListing = (row: CardRow): Listing => ({
    id: row.id,
    sellerAccount: row.seller_account,
    sellerHandle: row.seller_handle,
    title: row.title,
    description: row.description,
    category: row.category,
    photoUrls: row.photo_paths.map(photoUrl),
    maxRounds: row.max_rounds,
    askingPrice: String(row.asking_price),
    status: row.status,
    reservedDealId: row.status === "reserved" ? row.reserved_deal_id : null,
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
            asking_price: req.askingPrice,
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

    async remove(id) {
      const { photo_paths } = check(await db.from("listings").delete().eq("id", id).select("photo_paths").single<{ photo_paths: string[] }>());
      if (photo_paths.length > 0) check(await db.storage.from(BUCKET).remove(photo_paths));
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

    async retireSlot(dealId) {
      check(await db.from("slots").update({ buyer_account: `retired:${dealId}` }).eq("deal_id", dealId).select("id").single());
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

    async profileByHandle(handle) {
      const row = optional(await db.from("profiles").select(PROFILE_COLUMNS).eq("handle", handle).maybeSingle<ProfileRow>());
      return row ? { ...toProfile(row), accountId: row.account_id } : null;
    },

    async profileOf(accountId) {
      const row = optional(await db.from("profiles").select(PROFILE_COLUMNS).eq("account_id", accountId).maybeSingle<ProfileRow>());
      return row ? toProfile(row) : null;
    },

    async saveProfile(accountId, fields, create) {
      const columns = { display_name: fields.displayName, bio: fields.bio, city: fields.city, avatar_url: fields.avatarUrl };
      const query = create
        ? db.from("profiles").insert({ account_id: accountId, handle: create.handle, auth: "wallet", ...columns })
        : db.from("profiles").update(columns).eq("account_id", accountId);
      const result = await query.select(PROFILE_COLUMNS).single<ProfileRow>();
      if (result.error?.code === UNIQUE_VIOLATION) throw new HttpError(409, "handle or login already has an account");
      return toProfile(check(result));
    },

    async addQuestion(listingId, asker, question) {
      const row = check(
        await db.from("questions").insert({ listing_id: listingId, asker_account: asker, question }).select(QUESTION_COLUMNS).single<QuestionRow>(),
      );
      return toQuestion(row);
    },

    async answeredQuestions(listingId) {
      const rows = check(
        await db
          .from("questions")
          .select(QUESTION_COLUMNS)
          .eq("listing_id", listingId)
          .not("answer", "is", null)
          .order("id")
          .returns<QuestionRow[]>(),
      );
      return rows.map(toQuestion);
    },

    async question(id) {
      const row = optional(await db.from("questions").select(QUESTION_COLUMNS).eq("id", id).maybeSingle<QuestionRow>());
      return row ? toQuestion(row) : null;
    },

    async answerQuestion(id, answer) {
      // The `answer is null` filter makes a second answer match no row instead of overwriting the first.
      const row = optional(
        await db
          .from("questions")
          .update({ answer, answered_at: new Date().toISOString() })
          .eq("id", id)
          .is("answer", null)
          .select(QUESTION_COLUMNS)
          .maybeSingle<QuestionRow>(),
      );
      return row ? toQuestion(row) : null;
    },

    async unansweredFor(seller) {
      const rows = check(
        await db
          .from("questions")
          .select(`${QUESTION_COLUMNS}, listings!inner(title, seller_account)`)
          .eq("listings.seller_account", seller)
          .is("answer", null)
          .order("id")
          .returns<(QuestionRow & { listings: { title: string } })[]>(),
      );
      return rows.map((row) => ({ ...toQuestion(row), listingTitle: row.listings.title }));
    },

    async addMessage(dealId, sender, body) {
      const row = check(
        await db.from("messages").insert({ deal_id: dealId, sender_account: sender, body }).select(MESSAGE_COLUMNS).single<MessageRow>(),
      );
      return toMessage(row);
    },

    async messagesOf(dealId, after) {
      const rows = check(
        await db.from("messages").select(MESSAGE_COLUMNS).eq("deal_id", dealId).gt("id", after).order("id").returns<MessageRow[]>(),
      );
      return rows.map(toMessage);
    },

    async messagesIn(dealIds, after, notFrom) {
      if (dealIds.length === 0) return [];
      const rows = check(
        await db
          .from("messages")
          .select(MESSAGE_COLUMNS)
          .in("deal_id", dealIds)
          .gt("id", after)
          .neq("sender_account", notFrom)
          .order("id")
          .returns<MessageRow[]>(),
      );
      return rows.map(toMessage);
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

    async addReceipt(receipt) {
      const row = {
        deal_id: receipt.dealId,
        kind: receipt.kind,
        tx_hash: receipt.txHash,
        signer_account: receipt.signerAccount,
        amount_yocto: receipt.amountYocto,
        recorded_at: receipt.recordedAt,
      };
      check(await db.from("receipts").upsert(row, { onConflict: "deal_id,kind", ignoreDuplicates: true }));
      const stored = check(await db.from("receipts").select(RECEIPT_COLUMNS).eq("deal_id", receipt.dealId).eq("kind", receipt.kind).single<ReceiptRow>());
      return toReceipt(stored);
    },

    async receiptsOf(dealIds) {
      if (dealIds.length === 0) return [];
      const rows = check(await db.from("receipts").select(RECEIPT_COLUMNS).in("deal_id", dealIds).order("recorded_at").returns<ReceiptRow[]>());
      return rows.map(toReceipt);
    },
  };
}
