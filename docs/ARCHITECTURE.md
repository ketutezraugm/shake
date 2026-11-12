# Architecture

Two stores, split by what the data is. The contract holds money, sealed limits and deals. Supabase holds descriptive data (listings, slots, profiles, Q&A, chat), reachable only through the relayer. Neither holds what the other owns. The contract and the TEE are the v1 ones, unchanged by the marketplace. Method names below are the shared contract; change only by PR. Design source: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md (Revision B).

## Components
- **SPA** (Vite + React + TS): shop and listing screens, key handling, ECIES encryption, polling (chat 3 s, inbox 10 s), reveal UI. A **signer abstraction** hides the two sign-in paths: a browser ed25519 key (Google or email) or a NEAR wallet's function-call key (NEAR Connect). The signer signs relayer requests and non-payable contract calls; payable calls go through the browser key or the wallet. Holds the seller's per-listing minimum and salts in localStorage. Uses the Supabase anon key for Auth only, never for tables.
- **Supabase** (hosted): Auth (Google or email link), Postgres (`listings`, `slots`, and from migration 0002 `profiles`, `questions`, `messages`), Storage (bucket `listing-photos`). RLS on with no policies, grants revoked: only the relayer (service role) reads or writes tables. No Realtime. Never holds limits, salts or user keys. Tables: docs/DATA-MODEL.md.
- **Relayer** (Node/TS, Hono): creates and funds `handle.<parent>.testnet` behind a Supabase JWT, serves the marketplace API (listings, photos, slots, claims, sync), questions, profiles, chat messages, the inbox, and proxies the AI assistant. Never sees limits or user keys (receives only the public key); it does hold the per-slot link tokens. Writes to Supabase with the service role.
- **Deal contract** (Rust, near-sdk 5.30.1, unchanged v1): deal state, ciphertexts, commitments, OutLayer call and callback, escrow. Demo contract `blind-deal-59xtyh4b.testnet`. One slot is one deal on it.
- **OutLayer WASM** (Rust, wasm32-wasip2, unchanged v1): decrypts, compares, draws price, returns `{deal_id, matched, price}`. Runs in TDX on `outlayer.testnet`.
- **NEAR AI Cloud** (Must): the product assistant, called only by the relayer. Should: browser-side E2EE chat completion that turns text into `{min}` or `{max}` (negotiator).
- **NEAR Connect wallets** (`@hot-labs/near-connect` 0.12.0; its manifest marks Meteor, Intear, Nightly, Unity and WalletConnect as testnet-capable, each with function-call key sign-in): sign-in returns a function-call access key on the deal contract; payable calls are approved in the wallet.

## Sequence
Account creation (Google or email path) happens once before the first step. Wallet users skip it.
```
Seller SPA    Relayer     Supabase    Contract    OutLayer/WASM    Buyer SPA
 |-sign in (Supabase Auth, or wallet key)-->|          |               |
 |-POST /accounts (JWT, {handle, publicKey})->|-profile|              |
 |<-accountId-|            |            |            |               |
 |-POST /listings (signed)->|-insert--->|            |               |
 |-POST /listings/:id/photos, PUT bytes to uploadUrl->|              |
 |-get_pubkey (view/exec)------------------------>|-->|              |
 |-create_deal x N, submit_limit(seller, enc(min), commit)->|  (each deal Waiting)
 |-POST /listings/:id/slots {slots:[{dealId,linkToken}]}->|           |
 |            |-get_deal per slot: verify on chain------>|           |
 |      (profile link /@handle goes in the seller's bio)    open /@handle
 |            |<-GET /listings/:id, /profiles/:handle, questions------|
 |            |<-POST /assistant {listingId, question}----------------|
 |            |  answer, or {unknown:true} -> "Ask the seller" posts a question
 |-POST /questions/:id/answer->|           |            |             |
 |            |<-POST /listings/:id/claim (signed)-------------------|
 |            |--{dealId, linkToken}----------------------------->|
 |            |            |  |<-submit_limit(buyer, enc(max), commit, linkToken)+fee-|
 |            |            |  |-request_execution(both ct)->|          |
 |            |            |  |   decrypt, compare, random price       |
 |            |            |  |<-on_outlayer_result({deal_id,matched,price})-|
 |<-poll get_deal: Matched / Retry / NoDeal ---------poll get_deal-->|
 |-POST /listings/:id/sync-->|-slot deals->|  listing reserved        |
 |-cancel unclaimed and Waiting slots------->|            |            |
 |<==== chat: POST/GET /deals/:dealId/messages (relayer checks the deal on chain) ====>|
 |            |            |  |<-deposit(deal_id) from buyer (within 24 h)-|
 |            |            |  |<-confirm_received (buyer)--------------|
 |<-price paid to seller------|--|            |            |            |
 |-POST /listings/:id/sync-->|  listing sold                            |
 |   (no deal with rounds left: seller's inbox "Round 2 requested", seller resubmits, buyer's call completes round 2)
 |   (expire / refund: sync sets the listing back to open)
```

## Contract
The v1 contract as deployed (`contract/src/lib.rs`), unchanged.
```rust
enum State { Created, Waiting, Computing, Retry, NoDeal, Matched, Funded, Released, Refunded }
// Waiting = one side has submitted this round; Retry = no deal this round, more rounds left; NoDeal = final

struct Deal {
  id: u64, seller: AccountId, buyer: Option<AccountId>,
  title: String, description: String,          // bounded length
  link_hash: [u8;32],                          // sha256 of one-time token
  max_rounds: u8, round: u8,                   // seller picks 1-3 (default 2); round starts at 1
  seller_cts: Vec<Vec<u8>>, buyer_cts: Vec<Vec<u8>>,         // one per round
  seller_commits: Vec<[u8;32]>, buyer_commits: Vec<[u8;32]>,
  state: State, price: Option<U128>,           // yoctoNEAR (see Units)
  matched_at_ns: Option<u64>,                  // set on Matched
  deadline_ns: Option<u64>,                    // set when Funded
}
```
In the marketplace the app passes the listing title and description to `create_deal` or a short placeholder (builder's call); the real descriptive data lives in Supabase.

**Units:** users enter Rupiah. Prices go into the TEE in Rupiah (integer string). The contract converts once, at Matched, at a fixed demo rate (`RP_PER_NEAR` = 100,000,000, written to `rp_per_near` by `new`; not a parameter, so a Rp 4.2M deal escrows 0.042 testnet NEAR; small on purpose because faucet limits are unverified), shown in the UI as "test rate". No oracle.
Storage keys: `deals: LookupMap<u64, Deal>` (prefix `d`), `next_id: u64`, `tee_pubkey: Vec<u8>`, `outlayer: AccountId`, `project_id: String`, `rp_per_near: u128`, plus the delivery window (all set in `new`; no later setter, so no admin). The contract account pays storage for every deal, up to 10 per listing, so fund it before the seed and the demo. Entity diagram and state table: docs/DATA-MODEL.md.

| Method | Signature | Access | Deposit |
|---|---|---|---|
| new | `(outlayer: AccountId, tee_pubkey: Vec<u8>, project_id: String, delivery_window_secs: Option<u64>)` init (`project_id` = OutLayer `owner/name`; the secret lives under the owner's account, profile `production`; the window is for test deployments, empty means 7 days) | once | 0 |
| create_deal | `(title, description, link_hash, max_rounds: u8) -> u64` | any; `max_rounds` in 1..=3 | 0 |
| submit_limit | `(deal_id, ct: Vec<u8>, commit: [u8;32], link_token: Option<String>)` | round 1: seller first, buyer only with a token whose hash matches (first buyer binds the link); later rounds: either side, once per round, only in `Retry`/`Waiting` | the call that completes a round must attach a nonzero OutLayer fee (0.0021 NEAR covers one execution, unused part refunded to that caller); other calls attach nothing. `ct` at most 512 bytes |
| on_outlayer_result | `(deal_id) -> ()` private callback, reads `promise_result(0)` | self, after predecessor check | 0 |
| deposit | `(deal_id)` payable | buyer, state Matched and within 24 h of `matched_at_ns` (later it panics) | exactly `price` |
| confirm_received | `(deal_id)` | buyer, state Funded | 0 |
| refund | `(deal_id)` | buyer or anyone, state Funded and now > deadline (`delivery_window_secs`, default 7 days) | 0 |
| cancel | `(deal_id)` | seller, state Created or Waiting; ends as NoDeal | 0 |
| expire | `(deal_id)` | anyone, state Matched and unfunded > 24 h after `matched_at_ns` | 0 |
| get_deal / get_state | views | any | 0 |

Rounds: on `matched:false`, the contract moves to `Retry` if `round < max_rounds` (incrementing `round`), else `NoDeal`. The contract takes one submission per side per round, so in a later round the seller must submit too; the buyer's call completes it only if the seller went first, and attaches the fee. If the result is malformed, the round counts as a no-deal and the attached fee is not refunded (OutLayer rule). Ciphertexts are public on-chain by design.

## OutLayer shapes (verified in the D1-08 spike; request and result envelope in DECISIONS.md; v1, unchanged)
Request `input_data`:
```json
{ "action": "match", "deal_id": 7, "round": 2,
  "seller_cts": ["<hex r1>", "<hex r2>"], "buyer_cts": ["<hex r1>", "<hex r2>"],
  "seller_commits": ["<hex r1>", "<hex r2>"], "buyer_commits": ["<hex r1>", "<hex r2>"] }
```
The commitments are the ones stored on-chain; the contract passes them so the WASM can check each ciphertext against them. Exactly one ciphertext and commitment per round and side, and `round` equals that count.
Plaintext inside each ciphertext: `{"deal_id":7,"side":"seller","round":2,"limit":"4000000","salt":"<hex>"}`. Commitment: `sha256("blind-deal:v1|{deal_id}|{side}|{round}|{limit}|{salt}")` over exactly those characters (`tee/src/commit.rs`; vectors in `tee/testvectors.json`). The WASM opens every round and checks across rounds that the buyer never lowered and the seller never raised their limit (monotonic concessions); a violation makes the result a no-deal. It then compares only the latest round. `limit` is a canonical decimal string (digits only, no leading zero, nonzero, fits u64) to avoid float and u64 problems; hash the same bytes on client and TEE. For a slot, the seller's round-1 limit is submitted at slot creation; a later round uses a new salt and the same or a lower minimum.
Response: `{"deal_id":7,"matched":true,"price":"4300000"}` or `{"deal_id":7,"matched":false}`. Price is uniform in [seller_min, buyer_max] from TEE entropy. Also a `get_pubkey` action returning the deal public key derived from a `PROTECTED_` secret. The WASM checks commitments against the salts, and that each plaintext's `deal_id` equals the request's and `side` matches its slot (so a seller ciphertext can't be replayed as the buyer's, or into another deal); any mismatch returns `{"deal_id":7,"error":"invalid"}`.

**Result trust (decided):** Must: the callback accepts results only via OutLayer's callback path (predecessor check per the template), and the README states that OutLayer's operator is currently centralised. Should, if the spike shows PROTECTED_ keys can sign: the WASM also signs `{deal_id, matched, price}` with an ed25519 key whose public half is fixed in the contract at `new`, and the contract verifies it.

## Relayer API
Types: `relayer/src/types.ts`. All endpoints: 120 requests/min/IP. Errors are `{error}` with 400/401/403/404/409/429/503. "Signed" means the request carries the account's signature (see Auth).

Built in PR #35:

| Endpoint | Auth | Purpose |
|---|---|---|
| GET /health | none | `{ok:true}` |
| GET /listings?q=&category=&cursor= | none | Open listings, newest first, 20 per page; `nextCursor` is the last `createdAt` |
| GET /listings/:id | none | One listing with `freeSlots` |
| POST /listings | signed | `{title, description, category, maxRounds, askingPrice}` -> listing (201); `askingPrice` is whole Rupiah as a digit string, required (MK-15) |
| POST /listings/:id/photos | seller | `{contentType}` (jpeg, png, webp) -> `{uploadUrl, photoUrl}`; PUT the bytes to `uploadUrl`; max 4, then 409; bucket limit 2 MB |
| POST /listings/:id/slots | seller | `{slots:[{dealId, linkToken}]}`, max 10 per listing (409 above); listing must be open; each deal verified on chain: the seller's, `Waiting`, no buyer, same `max_rounds`, token hashes to `link_hash` |
| POST /listings/:id/claim | signed buyer | `{dealId, linkToken}`; the same slot on repeat; 409 when none is free or the listing is not open; 403 for the seller |
| POST /listings/:id/close | seller | Ends an open listing |
| POST /listings/:id/sync | none | Re-reads the slot deals and updates the listing status (rules in docs/DATA-MODEL.md). Matched or Funded reserves, Released sells, an expired or refunded reservation reopens |
| GET /me/listings | signed | The seller's listings with `slots: [{dealId, buyerAccount}]` (no link tokens) |
| GET /me/negotiations | signed | The buyer's claimed deals with link tokens |

Revision B, to build:

| Endpoint | Auth | Purpose | Limit |
|---|---|---|---|
| POST /accounts | Supabase JWT | `{handle, publicKey}` -> `{accountId}`; creates `handle.<parent>.testnet` with the key as full-access key and funds it; writes the profile; 401 without JWT, 409 for a second account or a taken handle, 429, 503 when the relayer runs low (D1-09 not yet in `app.ts`; MK-11) | 3 per IP per hour, global daily cap; one account per Supabase user |
| GET /profiles/:handle | none | Public profile: handle, display name, avatar, bio, city; 404 if unknown | default |
| GET /accounts/me | Supabase JWT | `{accountId, handle}` for the login, or 404 before it has an account; lets a returning user on a new device be sent to key import | default |
| GET /me/profile | signed | The caller's own profile, or 404 before one exists (a wallet user's first sign-in) | default |
| PUT /me/profile | signed | Updates the caller's profile row (CORS `allowMethods` must add PUT) | default |
| GET /listings/:id/questions | none | Answered questions only | default |
| POST /listings/:id/questions | signed | `{question}` | default |
| POST /questions/:id/answer | seller | `{answer}`; only the listing's seller, else 403 | default |
| POST /assistant | signed | `{listingId, question}` -> `{answer}` or `{unknown:true}` | 20 per account per hour, global daily cap to protect the NEAR AI credit |
| GET /deals/:dealId/messages?after= | signed | Messages after a cursor; the relayer reads the deal on chain; caller must be its seller or buyer and the state Matched, Funded, Released or Refunded (403 or 409 otherwise) | default |
| POST /deals/:dealId/messages | signed | `{body}`; same checks | default |
| GET /me/inbox | signed | Unanswered questions on my listings, my slots waiting for my next round, matches, unread messages | default |

Funding is a fixed small amount (set in env). The relayer account is funded from the faucet. Wallet users are not funded by the relayer. The app calls `/listings/:id/sync` after every chain call that changes the listing (match, deposit, confirm, refund, expire). There is no indexer.

## Auth
**Signed requests** (`relayer/src/auth.ts`). Headers: `x-account-id`, `x-public-key`, `x-timestamp` (ms), `x-signature` (base64 ed25519). The signature covers the exact string `blind-deal-relayer:v1|{METHOD}|{path}|{sha256 hex of the raw body}|{timestamp}`, path without query. The relayer rejects a timestamp more than 5 minutes off (`MAX_SKEW_MS`), checks the signature, then checks on chain that the key belongs to the account (any access key, full or function-call; cached 60 s). 401 on any failure.
**Supabase JWT, `POST /accounts` only.** The Google or email user signs in with Supabase Auth; the app sends the access token as `Authorization: Bearer`. The relayer verifies it and maps the Supabase user to one NEAR account. The browser generates the ed25519 key and sends only the public key. After this, the user signs relayer requests like any account.
**Wallet function-call key.** NEAR Connect sign-in asks the wallet to add a function-call access key on the deal contract for the account. The browser keeps that key and signs relayer requests with it (the relayer accepts any access key of the account) and non-payable contract calls (`create_deal`, the seller's `submit_limit`, `cancel`, `confirm_received`). Payable calls (the buyer's round-completing `submit_limit` with the fee, `deposit`) go through the wallet. No relayer call is needed for wallet users.

## AI assistant
The relayer receives `{listingId, question}`, loads the listing and its answered Q&A from Supabase, and calls NEAR AI Cloud with a system prompt: answer only from the given listing text and Q&A; never discuss price, offers or the seller's minimum; when the answer is not there, reply with a fixed "unknown" marker. The app turns that marker into an "Ask the seller" button that posts a question. The seller's answer shows on the listing and the assistant uses it from then on. The model never receives the minimum, because nothing on the server has it. Which NEAR AI model and the prompt wording within these rules are the builder's call. The key is the $10 NEAR Builders credit from nearbuilders.org/dashboard: a separate key that does not show in cloud.near.ai.

## Keys and secrets
Env vars (relayer): `RELAYER_ACCOUNT_ID`, `RELAYER_PRIVATE_KEY`, `APP_PARENT_ACCOUNT`, `NEAR_RPC_URL`, `FUND_AMOUNT`, `ALLOWED_ORIGIN`, `PORT`, `CONTRACT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only), `NEAR_AI_API_KEY` (now Must, server-side only). Build-time (app): `VITE_CONTRACT_ID`, `VITE_RELAYER_URL`, `VITE_TEE_PUBKEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Auth only; it reads and writes no table). OutLayer payment key. Never in the repo: private keys, `.env`, the service role key, payment key, `~/.near-credentials`. Commit `.env.example` only. User keys exist only in the browser or the wallet; the relayer never holds them. A Google or email user on a device without the key can browse, ask and chat but must import the key to list, offer or pay.

## Repo
```
contract/  Rust deal contract + tests (v1)
tee/       OutLayer WASM + offline unit tests (v1)
app/       Vite React SPA
relayer/   Node/TS service (Hono): marketplace API, accounts, assistant
supabase/migrations/  SQL: 0001 listings and slots, 0002 profiles, questions, messages
docs/      PRD, ARCHITECTURE, TEAM, DECISIONS, IDENTITY
```

## Environments, CI, deploy
- Local: `cargo test`, `npm run dev` for app and relayer against testnet and the hosted Supabase project. No sandbox needed. Testnet only.
- CI (GitHub Actions, on PR): `cargo test` (contract, tee), typecheck, lint, build (app, relayer).
- Supabase: one hosted project; schema lives in `supabase/migrations/`. How migrations are applied is the builder's call.
- Render: static site for `app/` (SPA rewrite to index.html, so `/@handle` resolves) and web service for `relayer/`, defined in `render.yaml`; secrets set with `sync: false`. Rollback: Render dashboard "Rollback" to the previous deploy; contract rollback is a new account redeploy plus env change (state is not migrated; acceptable for demo). Keep up until 2026-11-25.

## Seed and demo
`npm run demo:seed` extends `scripts/roundtrip.mjs` and runs real testnet transactions through the TEE. It creates the demo shop `@demo` with several listings (the team's own photos of real items) and their slots: one listing with a deal that is matched, funded and Released (seller_min 4M, buyer_max 4.6M) and a short chat between the two accounts, one with a NoDeal result (5M against 4M), and the rest open with free slots. Supabase rows and chain state agree after a sync.

## Stack
| Item | Version | Why | Rejected |
|---|---|---|---|
| near-sdk | 5.30.1 | Current Rust SDK | near-sdk-js (archived) |
| cargo-near / near-cli-rs | 0.31.1 (cli) | Standard build/deploy | Hand-rolled wasm-opt |
| OutLayer WASM | wasm32-wasip2 | Only TEE with a path from a contract; no infra | Shade Agent (3-6 h Docker/Phala setup) |
| near-api-js | 7.4.0 | Verified current, widest examples; we need key gen, tx signing and view calls only | near-kit 0.20.2 (newer, fewer examples) |
| NEAR Connect (wallet login) | `@hot-labs/near-connect` 0.12.0 | One connector for Meteor, Intear, Nightly and others, testnet-capable, with a function-call key | Wallet selector variants not checked |
| Vite + React + TS | UNVERIFIED version, pin at repo init | Matches brief | Next.js (no SSR need) |
| eciesjs | UNVERIFIED version | Used by private-dao-example | Own crypto |
| Supabase (hosted: Auth, Postgres, Storage) | n/a | Sign-in, listings, photos, Q&A and chat storage as configuration, behind the relayer | Relayer with SQLite on a Render disk; listings on-chain with photos on FastFS; Realtime (not needed, the app polls) |
| @supabase/supabase-js | 2.119.0 (relayer); app version UNVERIFIED, pin at repo init | Official client; the app uses it for Auth only | Hand-rolled REST |
| Hono + @hono/node-server | 4.13.18 + 2.1.8 | Relayer HTTP, as in `relayer/package.json` | Serverless |
| Render | n/a | Per brief | Vercel |
| NEAR AI Cloud | `cloud-api.near.ai/v1` | Assistant (Must); E2EE inference with attestation (Should) | Local template parser (fallback) |
