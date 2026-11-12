# Architecture

Two stores, split by what the data is. The contract holds money, sealed limits and deals. Supabase holds descriptive data (profiles, listings, photos, Q&A, chat). Neither holds what the other owns. Method names below are the shared contract; change only by PR. Design source: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md.

## Components
- **SPA** (Vite + React + TS): sign-in, shop and listing screens, key generation, ECIES encryption, polling, reveal UI, chat. Holds the user's ed25519 key in localStorage (per device; "export key" and "import key" move it). Talks to Supabase with the anon key and the user's session.
- **Supabase** (hosted): Auth (Google or email link), Postgres (`profiles`, `listings`, `questions`, `threads`, `messages`, with RLS), Storage (bucket `listing-photos`), Realtime (chat and the in-app inbox). Never holds limits, salts or keys. Tables and RLS: docs/DATA-MODEL.md.
- **Relayer** (Node/TS): creates and funds `handle.<parent>.testnet` behind a Supabase JWT, proxies the AI assistant, syncs listing state from the contract to Supabase, opens chat threads. Never sees limits or user keys (receives only the public key). Writes to Supabase with the service role.
- **Deal contract** (Rust, near-sdk 5.30.1): listings with the sealed minimum, offers and deals, ciphertexts, commitments, OutLayer call and callback, escrow.
- **OutLayer WASM** (Rust, wasm32-wasip2): decrypts, compares, draws price, returns `{deal_id, matched, price}`. Runs in TDX on `outlayer.testnet`.
- **NEAR AI Cloud** (Must): the product assistant, called only by the relayer. Should: browser-side E2EE chat completion that turns text into `{min}` or `{max}` (negotiator).

## Sequence
```
Seller SPA    Supabase     Relayer      Contract     OutLayer/WASM    Buyer SPA
 |-sign in--->|              |            |              |               |
 |-POST /accounts (JWT)----->|            |              |               |
 |            |<-near_account_id (service role)          |               |
 |-insert listing (uuid), upload photos->|                |               |
 |-create_listing(listing_id, enc(min), commit, max_rounds)->|           |
 |-POST /listings/:id/sync-->|-get_listing->|             |               |
 |            |<-chain_state = Open         |             |               |
 |       (profile link /@handle goes in the seller's bio)  |   open /@handle
 |            |------------ read shop, listing, Q&A ------------------>|
 |            |              |<--POST /assistant {listing_id, question}--|
 |            |<-listing + answered Q&A-|   |              |  answer or "unknown"
 |            |<------ "Ask the seller" inserts a question --------------|
 |-answer---->| (shows on the listing, assistant uses it)               |
 |            |              |   |<--make_offer(listing_id, enc(max), commit)+fee-|
 |            |              |   |--request_execution(seller_cts, buyer_cts)-->|
 |            |              |   |      decrypt, compare, random price   |
 |            |              |   |<--on_outlayer_result({deal_id,matched,price})--|
 |<--poll get_deal: Matched / Retry / NoDeal --------------poll get_deal-->|
 |            |              |<-POST /listings/:id/sync (listing Reserved)--|
 |            |              |<-POST /threads/:dealId/open (deal Matched)---|
 |            |<-threads.open = true----|             |               |
 |            |              |   |<--deposit(deal_id) from buyer---------|
 |<==== chat via Realtime (messages) =================================>|
 |            |              |   |<--confirm_received (buyer)------------|
 |<--price paid to seller----|---|                    |                 |
 |            |              |<-POST /listings/:id/sync (listing Sold)----|
 |            |   (or refund(deal_id) after deadline: listing back to Open)
```

## Contract
```rust
enum ListingState { Open, Reserved, Sold, Closed }
enum State { Computing, Retry, NoDeal, Matched, Funded, Released, Refunded }
// Computing = OutLayer running for this round; Retry = no deal this round, more rounds left; NoDeal = final

struct Listing {
  seller: AccountId,
  seller_cts: Vec<Vec<u8>>, seller_commits: Vec<[u8;32]>,   // one entry in Must; a vector so "lower the minimum" (Should) needs no migration
  max_rounds: u8,                              // seller picks 1-3 (default 2)
  offers_made: u8,                             // counts make_offer calls; cap 10
  state: ListingState,
}

struct Deal {
  id: u64, listing_id: String, buyer: AccountId,   // one deal per (listing, buyer)
  round: u8,                                   // starts at 1
  buyer_cts: Vec<Vec<u8>>, buyer_commits: Vec<[u8;32]>,     // one per round
  state: State, price: Option<U128>,           // yoctoNEAR (see Units)
  matched_at_ns: Option<u64>,                  // set on Matched
  deadline_ns: Option<u64>,                    // set when Funded
}
```
`listing_id` is the Supabase listing uuid, chosen by the client before `create_listing` so the seller's ciphertext can bind to it. The contract no longer stores title, description or a link token; those live in Supabase. The seller is read from `Listing` at release. Created and Waiting are gone: a deal starts in Computing, because the seller's limit is already in.

**Units:** users enter Rupiah. Prices go into the TEE in Rupiah (integer string). The contract converts once, at Matched, at a fixed demo rate (`RP_PER_NEAR` = 100,000,000, written to `rp_per_near` by `new`; not a parameter, so a Rp 4.2M deal escrows 0.042 testnet NEAR; small on purpose because faucet limits are unverified), shown in the UI as "test rate". No oracle.
Storage keys: `listings: LookupMap<String, Listing>`, `deals: LookupMap<u64, Deal>` (prefix `d`), `next_id: u64`, `tee_pubkey: Vec<u8>`, `outlayer: AccountId`, `project_id: String`, `rp_per_near: u128` (all but the maps set in `new`; no later setter, so no admin). How the contract finds the deal for a (listing, buyer) pair and which deal is Computing on a listing is the builder's call. Entity diagram and state tables: docs/DATA-MODEL.md.

| Method | Signature | Access | Deposit |
|---|---|---|---|
| new | `(outlayer: AccountId, tee_pubkey: Vec<u8>, project_id: String)` init (`project_id` = OutLayer `owner/name`; the secret lives under the owner's account, profile `production`) | once | 0 |
| create_listing | `(listing_id: String, ct: Vec<u8>, commit: [u8;32], max_rounds: u8)` | any (caller becomes the seller); one per `listing_id`; `max_rounds` in 1..=3; `ct` at most 512 bytes | 0 |
| make_offer | `(listing_id, ct: Vec<u8>, commit: [u8;32]) -> u64` (deal id) | any signed-in buyer except the seller; one deal per (listing, buyer); listing must be Open and `offers_made < 10`; no other deal on the listing in Computing, else panics "busy" and the app retries; starts round 1 and calls OutLayer at once | nonzero OutLayer fee (0.0021 NEAR covers one execution, unused part refunded to the caller). `ct` at most 512 bytes |
| raise_offer | `(deal_id, ct: Vec<u8>, commit: [u8;32])` | the deal's buyer, state Retry, listing Open; same "busy" rule; next round | nonzero OutLayer fee, as above |
| on_outlayer_result | `(deal_id) -> ()` private callback, reads `promise_result(0)` | self, after predecessor check | 0 |
| deposit | `(deal_id)` payable | buyer, state Matched | exactly `price` |
| confirm_received | `(deal_id)` | buyer, state Funded; deal Released, listing Sold | 0 |
| refund | `(deal_id)` | buyer or anyone, state Funded and now > deadline; deal Refunded, listing Open | 0 |
| expire | `(deal_id)` | anyone, state Matched and unfunded after the expiry window from `matched_at_ns`; deal NoDeal, listing Open | 0 |
| close_listing | `(listing_id)` | seller, listing Open | 0 |
| get_listing / get_deal | views | any | 0 |

Listing transitions: `create_listing` gives Open. A match (`on_outlayer_result`, `matched: true`) gives Reserved. `confirm_received` gives Sold. `refund` and `expire` give Open again. `close_listing` gives Closed. At most one deal per listing is in Computing at a time, so two simultaneous matches on one item cannot happen. Other buyers' deals in Retry wait: `raise_offer` is refused unless the listing is Open, so they can continue if the reservation expires or is refunded.
Escrow methods keep their rules, including the late-deposit and delivery-window changes in PR #30 (the expiry window and delivery window values are the builder's call; the contract rewrite builds on #30 and ships in the same redeploy). The contract is a fresh deploy to a new account because the storage layout changes; old deals are not migrated.
Rounds: on `matched:false`, the contract moves the deal to `Retry` if `round < listing.max_rounds` (incrementing `round`), else `NoDeal`. If the result is malformed, the round counts as a no-deal and the attached fee is not refunded (OutLayer rule). Ciphertexts are public on-chain by design.

## OutLayer shapes (verified in the D1-08 spike; request and result envelope in DECISIONS.md; v2 below)
Request `input_data`:
```json
{ "action": "match", "listing_id": "<uuid>", "deal_id": 7, "buyer": "alice.app.testnet", "round": 2,
  "seller_cts": ["<hex>"], "seller_commits": ["<hex>"],
  "buyer_cts": ["<hex r1>", "<hex r2>"], "buyer_commits": ["<hex r1>", "<hex r2>"] }
```
The commitments are the ones stored on-chain; the contract passes them so the WASM can check each ciphertext against them. The seller side has one entry in the Must build; the buyer side has exactly one ciphertext and commitment per round, and `round` equals that count. If `seller_cts` ever holds more than one entry (Should), which entry the TEE uses is the builder's call.
Plaintexts inside the ciphertexts:
- Seller: `{"listing_id":"<uuid>","side":"seller","limit":"4000000","salt":"<hex>"}`
- Buyer: `{"listing_id":"<uuid>","buyer":"alice.app.testnet","side":"buyer","round":2,"limit":"4600000","salt":"<hex>"}`

Commitments, over exactly those characters (`tee/src/commit.rs`; vectors in `tee/testvectors.json`):
- Seller: `sha256("blind-deal:v2|listing|{listing_id}|seller|{limit}|{salt}")`
- Buyer: `sha256("blind-deal:v2|offer|{listing_id}|{buyer}|{round}|{limit}|{salt}")`

The buyer binds to its own account and the listing, not to a deal id it cannot know before `make_offer`. The WASM opens the seller's entry and every buyer round, checks every commitment and binding (listing id, buyer account, side, round), and checks that the buyer never lowered a limit across rounds (a violation makes the result a no-deal). It then compares only the latest buyer round with the seller's limit. `limit` is a canonical decimal string (digits only, no leading zero, nonzero, fits u64) to avoid float and u64 problems; hash the same bytes on client and TEE.
Response: `{"deal_id":7,"matched":true,"price":"4300000"}` or `{"deal_id":7,"matched":false}`. Price is uniform in [seller_min, buyer_max] from TEE entropy. Also a `get_pubkey` action returning the deal public key derived from a `PROTECTED_` secret. Any binding or commitment mismatch returns `{"deal_id":7,"error":"invalid"}`, so a seller ciphertext cannot be replayed as a buyer's, into another listing, or under another buyer.
The build changes the WASM, so it is rebuilt, redeployed and the secret's build lock is moved (DECISIONS.md procedure).

**Result trust (decided):** Must: the callback accepts results only via OutLayer's callback path (predecessor check per the template), and the README states that OutLayer's operator is currently centralised. Should, if the spike shows PROTECTED_ keys can sign: the WASM also signs `{deal_id, matched, price}` with an ed25519 key whose public half is fixed in the contract at `new`, and the contract verifies it.

## Relayer API
| Endpoint | Request | Response | Limit |
|---|---|---|---|
| POST /accounts | Supabase JWT; `{handle, publicKey}` | `{accountId}` or 401/409/429/503; writes `profiles.near_account_id` | 3 per IP per hour, global daily cap; one account per user (409 on repeat) |
| POST /assistant | Supabase JWT; `{listingId, question}` | `{answer}` or `{unknown:true}` | 20 per user per hour, global daily cap to protect the NEAR AI credit |
| POST /listings/:id/sync | none | `{chainState}`; reads `get_listing`, writes `listings.chain_state` | builder's call |
| POST /threads/:dealId/open | Supabase JWT | `{open:true}` or 409 when the deal is not Matched or later (Matched, Funded, Released, Refunded) | builder's call |
| GET /health | none | `{ok:true}` | 60/min/IP |

Funding is a fixed small amount (set in env). The relayer account is funded from the faucet; if it runs low, `/accounts` returns 503. `POST /threads/:dealId/open` reads the deal from the contract and sets `threads.open = true` with the service role; the browser cannot open a chat by itself. Creating the `threads` row for a deal (relayer on first open, or the browser before) is the builder's call; the relayer path is the default here.
The app calls `/listings/:id/sync` after every chain call that changes the listing (create, match, confirm, refund, expire, close). There is no indexer. An expired reservation shows as Reserved until the next sync, which is acceptable.

## AI assistant
The relayer receives `{listingId, question}`, loads the listing and its answered Q&A from Supabase, and calls NEAR AI Cloud with a system prompt: answer only from the given listing text and Q&A; never discuss price, offers or the seller's minimum; when the answer is not there, reply with a fixed "unknown" marker. The app turns that marker into an "Ask the seller" button that creates a `questions` row. The seller's answer shows on the listing and the assistant uses it from then on. The model never receives the minimum, because nothing on the server has it. Which NEAR AI model and the prompt wording within these rules are the builder's call. The key is the $10 NEAR Builders credit from nearbuilders.org/dashboard: a separate key that does not show in cloud.near.ai.

## Keys and secrets
Env vars (relayer): `RELAYER_ACCOUNT_ID`, `RELAYER_PRIVATE_KEY`, `APP_PARENT_ACCOUNT`, `NEAR_RPC_URL`, `FUND_AMOUNT`, `ALLOWED_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only), `NEAR_AI_API_KEY` (now Must). Build-time (app): `VITE_CONTRACT_ID`, `VITE_RELAYER_URL`, `VITE_TEE_PUBKEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. OutLayer payment key. Never in the repo: private keys, `.env`, the service role key, payment key, `~/.near-credentials`. Commit `.env.example` only. User keys exist only in the browser; the relayer never holds them. A signed-in user on a device without the key can browse, ask and chat but must import the key to offer, list or pay.

## Repo
```
contract/  Rust deal contract + tests
tee/       OutLayer WASM + offline unit tests
app/       Vite React SPA
relayer/   Node/TS service
supabase/migrations/  SQL schema, RLS, storage bucket
docs/      PRD, ARCHITECTURE, TEAM, DECISIONS, IDENTITY
```

## Environments, CI, deploy
- Local: `cargo test`, `npm run dev` for app and relayer against testnet and the hosted Supabase project. No sandbox needed. Testnet only.
- CI (GitHub Actions, on PR): `cargo test` (contract, tee), typecheck, lint, build (app, relayer).
- Supabase: one hosted project; schema and RLS live in `supabase/migrations/`. How migrations are applied is the builder's call.
- Render (unchanged): static site for `app/` (SPA rewrite to index.html, so `/@handle` resolves) and web service for `relayer/`, defined in `render.yaml`; secrets set with `sync: false`. Rollback: Render dashboard "Rollback" to the previous deploy; contract rollback is a new account redeploy plus env change (state is not migrated; acceptable for demo). Keep up until 2026-11-25.

## Seed and demo
`npm run demo:seed` extends `scripts/roundtrip.mjs` and runs real testnet transactions through the TEE. It creates the demo shop `@demo` with several listings (the team's own photos of real items): one with a deal that is matched, funded and Released (seller_min 4M, buyer_max 4.6M), one with a NoDeal result (5M against 4M), and one left Open. Supabase rows and chain state agree after a sync.

## Stack
| Item | Version | Why | Rejected |
|---|---|---|---|
| near-sdk | 5.30.1 | Current Rust SDK | near-sdk-js (archived) |
| cargo-near / near-cli-rs | 0.31.1 (cli) | Standard build/deploy | Hand-rolled wasm-opt |
| OutLayer WASM | wasm32-wasip2 | Only TEE with a path from a contract; no infra | Shade Agent (3-6 h Docker/Phala setup) |
| near-api-js | 7.4.0 | Verified current, widest examples; we need key gen, tx signing and view calls only | near-kit 0.20.2 (newer, fewer examples) |
| Vite + React + TS | UNVERIFIED version, pin at repo init | Matches brief | Next.js (no SSR need) |
| eciesjs | UNVERIFIED version | Used by private-dao-example | Own crypto |
| Supabase (hosted: Auth, Postgres, Storage, Realtime) | n/a | Sign-in, listings, photos, Q&A, chat and search as configuration | Relayer with SQLite on a Render disk (auth, upload, realtime and search hand-built); listings on-chain with photos on FastFS (RPC-view browse, storage deposit per listing) |
| @supabase/supabase-js | UNVERIFIED version, pin at repo init | Official client for Auth, queries, Storage and Realtime | Hand-rolled REST |
| Node/TS + small HTTP lib | UNVERIFIED | Relayer is a handful of endpoints | Serverless |
| Render | n/a | Per brief | Vercel |
| NEAR AI Cloud | `cloud-api.near.ai/v1` | Assistant (Must); E2EE inference with attestation (Should) | Local template parser (fallback) |
