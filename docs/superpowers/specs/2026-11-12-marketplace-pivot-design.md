# Marketplace pivot: design

Date: 2026-11-12. Owner: Ezra (lead). Status: approved in conversation; this doc feeds the rewrite of PRD, ARCHITECTURE, DATA-MODEL, IMPLEMENTATION and TEAM.

## Intent

Blind deal was one link a seller pastes into a chat. It becomes a second-hand marketplace in the style of OLX: seller profiles, listings with photos, public browsing, Q&A and chat. The seller puts their profile link (`/@handle`) in the bio of their Instagram or marketplace profile, so buyers arrive at a shop, not a single deal. The blind price stays the way a sale happens: no listing shows a price, the seller's minimum is sealed to the TEE, and each buyer makes a blind offer.

Why: a single deal link is a feature; a shop is a product judges and real users recognise, and it gives the AI a natural job (answering product questions) that never touches the price.

## Goals
- A buyer who taps a bio link sees the seller's shop, opens a listing, asks the AI about it, makes a blind offer, and on a match pays into escrow, chats with the seller and confirms "Received".
- The seller lists an item once (photos, details, sealed minimum, rounds) and can be offline while buyers make offers.
- The privacy story stays intact: no price before a deal, the minimum never reaches the app server, the relayer or the AI.

## Non-goals
- Shipping integration, delivery tracking, payment outside escrow.
- Seller-side per-buyer negotiation (the seller sets the minimum once per listing).
- Moderation tooling beyond what Supabase gives for free.
- Mainnet, real money, native app.

## Anti-goals (a failure even if it works)
- Any path where a buyer sees or can infer the seller's minimum beyond the stated 1 bit per round and the capped offers.
- Free-form chat before a deal (users would type prices and undo the blind offer).
- Visible chain: gas prompts, seed phrases or wallet pop-ups in the main flow.

## Constraints
- Feature freeze moves to **2026-11-14 00:00 UTC**; submission stays **2026-11-14 12:00 UTC**; hard wall 23:59 UTC is buffer only.
- Testnet only. Original visuals only; Abel owns all design (IDENTITY.md and Phase 3/7 are not redone here).
- The contract, TEE matcher, escrow and relayer already work on testnet (M1-01..M1-07); reuse them.

## Approaches considered
1. **Supabase for marketplace data, contract for money (chosen).** Supabase Auth, Postgres, Storage and Realtime cover sign-in, listings, photos, Q&A, chat and search as configuration. The contract keeps the sealed minimum, offers, deals and escrow.
2. Relayer with its own SQLite on a Render disk. One fewer service, but auth, photo upload, realtime chat and search would be hand-built in 36 hours. Rejected.
3. Listings on-chain, photos on FastFS. "More NEAR-native", but browse and search become RPC views, every listing costs storage deposit, photos get awkward. The sealed minimum and deals are already the on-chain story. Rejected.

## Decisions made with Ezra
- Schedule: freeze 11-14 00:00 UTC, submit 11-14 12:00 UTC.
- **No chat before a deal.** Before a deal, buyers ask an **AI product assistant** on the listing page. When it doesn't know, the question goes to the seller and the seller's answer appears on the listing as **public Q&A**, which the AI then uses. Chat between buyer and seller opens after a match.
- **Seller's minimum set once per listing**, sealed to the TEE. Each buyer gets the seller's chosen rounds (1-3, default 2); the buyer can only raise. Blind offers are capped per listing (10) and the count is shown ("3 of 10 offers used").
- **Sign-in with Google or email (Supabase Auth)**; the relayer creates the user's NEAR account behind it. Chain stays invisible.
- Architecture approach 1.

## Product scope

**Must (by the freeze):**
1. Sign-in (Google or email link) creates a profile and, behind it, `handle.<parent>.testnet` funded by the relayer.
2. Seller profile at `/@handle`: avatar, display name, bio, city, active listings, sold count. This is the bio link.
3. Create listing: title, description, up to 5 photos, category, condition, city, rounds (1-3), sealed minimum. No price field shown publicly.
4. Public browse: home grid of open listings, text search, category filter.
5. Listing page: photos, details, seller card, "Blind offer" badge, offers-used counter, AI assistant, public Q&A.
6. AI product assistant (NEAR AI Cloud via the relayer): answers from the listing and its public Q&A only; when unsure it says so and offers "Ask the seller".
7. Public Q&A: signed-in buyers ask; only the seller answers; answered questions show on the listing.
8. Blind offer: buyer enters a maximum (encrypted in the browser to the TEE key), up to the listing's rounds, raising only. Reveal shows "Deal at Rp X" or "No deal".
9. On a match the listing becomes Reserved; buyer pays into escrow; "Received" releases to the seller and the listing becomes Sold. Expiry or refund reopens it.
10. Chat per deal, opened at Matched, between the two parties only.
11. Seeded demo shop with several listings (team's own photos of real items) and a seeded matched deal.

**Should:** AI negotiator (natural-language limit), Verified attestation panel, seller ratings after Sold, saved items, seller lowers the minimum on a live listing, E2EE prompts to NEAR AI.
**Could:** pay from another chain via 1Click, dispute flow, connect an existing wallet, Bahasa toggle.
**Won't:** mainnet, shipping, payments outside escrow, account recovery beyond "export key".

## Architecture (as decided)

```
Browser SPA ──Supabase Auth/Postgres/Storage/Realtime── profiles, listings, photos, questions, threads, messages
     │
     ├── Relayer (Node): POST /accounts (needs Supabase JWT), POST /assistant (NEAR AI proxy), POST /threads/:dealId/open
     │
     └── Contract (Rust) ── listings (sealed minimum), offers/deals, rounds, escrow ── OutLayer WASM (TEE match)
```

**Where data lives.** Money, sealed limits, commitments, deal state: contract. Everything descriptive (titles, photos, Q&A, chat, profiles): Supabase. The contract no longer stores title, description or a link token.

**Contract changes (Ezra).**
- `create_listing(listing_id: String, ct, commit, max_rounds: u8)`: `listing_id` is the Supabase listing uuid, chosen by the client before the call so the seller's ciphertext can bind to it. One per id; caller is the seller. Stores `Listing { seller, seller_ct, seller_commit, max_rounds, offers_made, state: Open | Reserved | Sold | Closed }`.
- `make_offer(listing_id, ct, commit) -> u64`: one deal per (listing, buyer); refused when the listing is not Open or `offers_made == 10`. Starts round 1 and calls OutLayer at once (the seller's limit is already in), so it attaches the OutLayer fee.
- `raise_offer(deal_id, ct, commit)`: next round while the deal is in `Retry`; attaches the fee.
- At most one deal per listing in `Computing` at a time; a second call panics "busy" and the app retries. This prevents two simultaneous matches on one item.
- On a match: deal `Matched`, listing `Reserved`. `expire` on an unfunded match and `refund` set the listing back to `Open`. `confirm_received` sets it `Sold`. `close_listing` by the seller while Open.
- Escrow methods (`deposit`, `confirm_received`, `refund`, `expire`) keep their rules, including the late-deposit and delivery-window changes in PR #30.
- Commitment v2: seller `sha256("blind-deal:v2|listing|{listing_id}|seller|{limit}|{salt}")`; buyer `sha256("blind-deal:v2|offer|{listing_id}|{buyer}|{round}|{limit}|{salt}")`. The buyer binds to its own account and the listing instead of a deal id it can't know before `make_offer`. Plaintexts carry the same fields.
- Fresh deploy to a new account (storage layout changes); old deals are not migrated.

**TEE changes (Ezra).** `match` takes the listing's seller ciphertext once plus the buyer's per-round ciphertexts; checks every commitment and binding (listing id, buyer account, side, round); checks the buyer never lowered; compares the latest round; returns `{deal_id, matched, price}`. Rebuild, redeploy, move the secret's build lock (DECISIONS.md procedure).

**Supabase (Harfi).** Tables: `profiles` (user id, handle, display name, avatar, bio, city, `near_account_id`), `listings` (uuid, seller, title, description, category, condition, city, photo paths, `chain_state` mirror, created_at), `questions` (listing, asker, question, answer, answered_at), `threads` (deal id, listing, buyer, seller, `open`), `messages` (thread, sender, body, created_at). RLS: profiles, listings and answered questions are public read; owners write their own rows; only the listing's seller answers; threads and messages readable and writable only by their two parties, and messages insertable only when `open`. Storage bucket `listing-photos`: public read, owner write. Full-text search on title and description.

**Relayer (Harfi).**
- `POST /accounts` now requires a Supabase JWT; one NEAR account per user; writes `profiles.near_account_id` with the service role. Rate limits stay.
- `POST /threads/:dealId/open`: reads the deal from the contract; if `Matched` or later, sets `threads.open = true`. The browser can't open a chat by itself.
- `POST /assistant`: see below.

**AI assistant.** The relayer receives `{listing_id, question}`, loads the listing and its answered Q&A from Supabase, and calls NEAR AI Cloud with a system prompt: answer only from the given listing text and Q&A; never discuss price, offers or the seller's minimum; when the answer is not there, reply with a fixed "unknown" marker. The app turns that marker into an "Ask the seller" button that creates a `questions` row. The model never receives the minimum, because nothing on the server has it. NEAR AI key from the $10 NEAR Builders claim (a separate key; it does not show in cloud.near.ai).

**Keys and devices.** The NEAR key is generated in the browser and stays per device, as today; "export key" and "import key" move it. A signed-in user on a device without the key can browse, ask and chat but must import the key to offer, list or pay. The relayer never holds user keys.

**Sybil and probing.** Each buyer account learns at most 1 bit per round; offers per listing are capped at 10; sign-in raises the cost of fake accounts. A match is binding and reserves the item, so probing upward costs a reservation the attacker must pay or let expire. Stated in the README.

## Tracks
Tag every track the project honestly fits (rules verified 2026-11-12: no cap on tags; whether one project can win several tracks is not stated). Proposal: `privacy` (TEE matching, sealed minimum), `agents` (AI assistant, plus the negotiator if it ships), `realworld` (escrowed merchant payments for real sellers). Final list is the team's call at submission.

## Team split (proposal)
- Ezra: contract and TEE changes, redeploy, the assistant prompt and relayer endpoint.
- Harfi: Supabase project and schema, RLS, relayer auth binding and thread opening, hosting, seed.
- Jose: all marketplace screens and the offer flow against the new contract.
- Abel: designs for the new screens (home, profile, listing, create listing, assistant, Q&A, chat), product photos for the seed shop, packaging.

## Calls made after the builder check (Ezra to confirm)
- **OutLayer fee:** the buyer attaches it on `make_offer` and `raise_offer`, as today (unused part refunded). It doubles as a small cost per probe. `FUND_AMOUNT` covers a few offers plus a demo-size escrow.
- **Seller minimum storage:** `Listing` keeps `seller_cts` and `seller_commits` as vectors from day one, with only one entry in the Must build, so the Should "lower the minimum" needs no storage migration.
- **Offers full:** one NEAR account per Supabase user (relayer-enforced) is the Sybil defence. A listing at 10 offers shows "Offers full"; the seller can close it and relist.
- **Chain-state mirror:** no indexer. The relayer gets `POST /listings/:id/sync`, which reads the contract and writes `listings.chain_state` with the service role. The app calls it after every chain call that changes the listing. An expired reservation shows as Reserved until the next sync, which is acceptable.
- **Seed:** real testnet transactions through the TEE, extending `scripts/roundtrip.mjs`.
- **Seller notifications (Ezra, decided):** in-app only for the Must build: an inbox and badge for new questions, matches and payments, fed by Supabase Realtime. Email notifications are a Should.
- **PR #30:** the contract rewrite builds on #30 (merged first, or branched from it) and ships in the same redeploy.

## Left to the builder
- Exact category list, photo size limits, search ranking.
- Unfunded-match expiry and delivery window values (PR #30 makes the delivery window configurable).
- Which NEAR AI model; prompt wording within the rules above.
- Retry/backoff when the contract answers "busy".
- Handle format and reserved handles.
