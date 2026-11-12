# Architecture

Source of truth for deals and money is the contract. Marketplace listings and photos live in Supabase, written only by the relayer (DECISIONS.md, 2026-11-12). Method names below are the day-1 shared contract; change only by PR.

## Components
- **SPA** (Vite + React + TS): key generation, ECIES encryption, polling, reveal UI. Holds the user's ed25519 key in localStorage.
- **Relayer** (Node/TS, Hono): creates and funds `name.<app>.testnet` (D1-09) and serves the marketplace API over Supabase. Never sees limits or user keys (receives only the public key); it does hold the per-slot link tokens.
- **Supabase** (Postgres + Storage): listings, slots (pre-created deals a buyer can claim), photos. Reachable only with the relayer's service-role key.
- **Deal contract** (Rust, near-sdk 5.30.1): deal state, ciphertexts, commitments, OutLayer call and callback, escrow.
- **OutLayer WASM** (Rust, wasm32-wasip2): decrypts, compares, draws price, returns `{deal_id, matched, price}`. Runs in TDX on `outlayer.testnet`.
- **NEAR AI Cloud** (Should): browser-side E2EE chat completion that turns text into `{min}` or `{max}`.

## Sequence
```
Seller SPA     Relayer     Deal contract       outlayer.testnet / WASM     Buyer SPA
 |-create acct->|             |                         |                      |
 |<-account-----|             |                         |                      |
 |--create_deal(title,desc)-->|                         |                      |
 |<-deal_id + link token------|                         |                      |
 |--get_pubkey (view/exec)----------------------------->|                      |
 |-enc(min)--submit_limit(seller)->|                    |                      |
 |         (link sent out of band)                       |            open link |
 |                            |<--submit_limit(buyer, enc(max))------------------|
 |                            |--request_execution(both ct)-->|                 |
 |                            |        decrypt, compare, random price           |
 |                            |<--callback on_outlayer_result({matched,price})--|
 |<--poll get_deal: MATCHED / NO_DEAL ---------------------------poll get_deal->|
 |                            |<--deposit(price) from buyer---------------------|
 |                            |<--confirm_received (buyer)----------------------|
 |<--price paid to seller-----|  (or refund(deal_id) after deadline)            |
```

## Contract
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
**Units:** users enter Rupiah. Prices go into the TEE in Rupiah (integer string). The contract converts once, at Matched, at a fixed demo rate (`RP_PER_NEAR` = 100,000,000, written to `rp_per_near` by `new`; not a parameter, so a Rp 4.2M deal escrows 0.042 testnet NEAR; small on purpose because faucet limits are unverified), shown in the UI as "test rate". No oracle.
Storage keys: `deals: LookupMap<u64, Deal>` (prefix `d`), `next_id: u64`, `tee_pubkey: Vec<u8>`, `outlayer: AccountId`, `project_id: String`, `rp_per_near: u128` (all set in `new`; no later setter, so no admin). Entity diagram and state table: docs/DATA-MODEL.md.

| Method | Signature | Access | Deposit |
|---|---|---|---|
| new | `(outlayer: AccountId, tee_pubkey: Vec<u8>, project_id: String, delivery_window_secs: Option<u64>)` init (`project_id` = OutLayer `owner/name`; the secret lives under the owner's account, profile `production`; the window is for test deployments, empty means 7 days) | once | 0 |
| create_deal | `(title, description, link_hash, max_rounds: u8) -> u64` | any; `max_rounds` in 1..=3 | 0 |
| submit_limit | `(deal_id, ct: Vec<u8>, commit: [u8;32], link_token: Option<String>)` | round 1: seller first, buyer only with a token whose hash matches (first buyer binds the link); later rounds: either side, once per round, only in `Retry`/`Waiting` | the call that completes a round must attach a nonzero OutLayer fee (0.0021 NEAR covers one execution, unused part refunded to that caller); other calls attach nothing. `ct` at most 512 bytes |
| on_outlayer_result | `(deal_id) -> ()` private callback, reads `promise_result(0)` | self, after predecessor check | 0 |
| deposit | `(deal_id)` payable | buyer, state Matched and within 24 h of `matched_at_ns` | exactly `price` |
| confirm_received | `(deal_id)` | buyer, state Funded | 0 |
| refund | `(deal_id)` | buyer or anyone, state Funded and now > deadline | 0 |
| cancel | `(deal_id)` | seller, state Created or Waiting; ends as NoDeal | 0 |
| expire | `(deal_id)` | anyone, state Matched and unfunded > 24 h after `matched_at_ns` | 0 |
| get_deal / get_state | views | any | 0 |

Rounds: on `matched:false`, the contract moves to `Retry` if `round < max_rounds` (incrementing `round`), else `NoDeal`. If the result is malformed, the round counts as a no-deal and the attached fee is not refunded (OutLayer rule). Ciphertexts are public on-chain by design.

## OutLayer shapes (verified in the D1-08 spike; request and result envelope in DECISIONS.md)
Request `input_data`:
```json
{ "action": "match", "deal_id": 7, "round": 2,
  "seller_cts": ["<hex r1>", "<hex r2>"], "buyer_cts": ["<hex r1>", "<hex r2>"],
  "seller_commits": ["<hex r1>", "<hex r2>"], "buyer_commits": ["<hex r1>", "<hex r2>"] }
```
The commitments are the ones stored on-chain; the contract passes them so the WASM can check each ciphertext against them. Exactly one ciphertext and commitment per round and side, and `round` equals that count.
Plaintext inside each ciphertext: `{"deal_id":7,"side":"seller","round":2,"limit":"4000000","salt":"<hex>"}`. Commitment: `sha256("blind-deal:v1|{deal_id}|{side}|{round}|{limit}|{salt}")` over exactly those characters (`tee/src/commit.rs`; vectors in `tee/testvectors.json`). The WASM opens every round and checks across rounds that the buyer never lowered and the seller never raised their limit (monotonic concessions); a violation makes the result a no-deal. It then compares only the latest round. `limit` is a canonical decimal string (digits only, no leading zero, nonzero, fits u64) to avoid float and u64 problems; hash the same bytes on client and TEE.
Response: `{"deal_id":7,"matched":true,"price":"4300000"}` or `{"deal_id":7,"matched":false}`. Price is uniform in [seller_min, buyer_max] from TEE entropy. Also a `get_pubkey` action returning the deal public key derived from a `PROTECTED_` secret. The WASM checks commitments against the salts, and that each plaintext's `deal_id` equals the request's and `side` matches its slot (so a seller ciphertext can't be replayed as the buyer's, or into another deal); any mismatch returns `{"deal_id":7,"error":"invalid"}`.

**Result trust (decided):** Must: the callback accepts results only via OutLayer's callback path (predecessor check per the template), and the README states that OutLayer's operator is currently centralised. Should, if the spike shows PROTECTED_ keys can sign: the WASM also signs `{deal_id, matched, price}` with an ed25519 key whose public half is fixed in the contract at `new`, and the contract verifies it.

## Relayer API
Types: `relayer/src/types.ts`. "Signed" requests carry `x-account-id`, `x-public-key`, `x-timestamp` (ms) and `x-signature` (base64 ed25519 over `blind-deal-relayer:v1|{METHOD}|{path}|{sha256 hex of body}|{timestamp}`, path without query); the relayer checks the key belongs to the account on chain. All endpoints: 120 requests/min/IP.

| Endpoint | Auth | Purpose |
|---|---|---|
| POST /accounts | none | `{name, publicKey}` -> `{accountId}` or 409/429/503; 3 per IP per hour, global daily cap (D1-09) |
| GET /health | none | `{ok:true}` |
| GET /listings?q=&category=&cursor= | none | Open listings, newest first, 20 per page; `nextCursor` is the last `createdAt` |
| GET /listings/:id | none | One listing with `freeSlots` |
| POST /listings | signed | `{title, description, category, maxRounds}` -> listing |
| POST /listings/:id/photos | seller | `{contentType}` -> `{uploadUrl, photoUrl}`; PUT the bytes to `uploadUrl`; max 4 |
| POST /listings/:id/slots | seller | `{slots:[{dealId, linkToken}]}` (max 10 per listing); each deal is verified on chain |
| POST /listings/:id/claim | buyer | -> `{dealId, linkToken}`; same slot on repeat; 409 when none is free, 403 for the seller |
| POST /listings/:id/close | seller | Ends an open listing |
| POST /listings/:id/sync | none | Re-reads the slot deals; marks the listing sold if one is Funded or Released |
| GET /me/listings, GET /me/negotiations | signed | The seller's listings with slots; the buyer's claimed deals with link tokens |

Categories: electronics, fashion, home, vehicles, hobbies, other. Errors are `{error}` with 400/401/403/404/409/429.

Funding is a fixed small amount (set in env). The relayer account is funded from the faucet; if it runs low, `/accounts` returns 503.

## Keys and secrets
Env vars: `RELAYER_ACCOUNT_ID`, `RELAYER_PRIVATE_KEY`, `APP_PARENT_ACCOUNT`, `NEAR_RPC_URL`, `FUND_AMOUNT`, `ALLOWED_ORIGIN`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTRACT_ID`; build-time `VITE_CONTRACT_ID`, `VITE_RELAYER_URL`, `VITE_TEE_PUBKEY`; Should: `NEAR_AI_API_KEY`. OutLayer payment key. Never in the repo: private keys, `.env`, payment key, `~/.near-credentials`. Commit `.env.example` only. User keys exist only in the browser.

## Repo
```
contract/  Rust deal contract + tests
tee/       OutLayer WASM + offline unit tests
app/       Vite React SPA
relayer/   Node/TS service (marketplace API)
supabase/  SQL migrations
docs/      PRD, ARCHITECTURE, TEAM, DECISIONS, IDENTITY
```

## Environments, CI, deploy
- Local: `cargo test`, `npm run dev` for app and relayer against testnet. No sandbox needed. Testnet only.
- CI (GitHub Actions, on PR): `cargo test` (contract, tee), typecheck, lint, build (app, relayer).
- Render: static site for `app/` (SPA rewrite to index.html) and web service for `relayer/`, defined in `render.yaml`; secrets set with `sync: false`. Rollback: Render dashboard "Rollback" to the previous deploy; contract rollback is a new account redeploy plus env change (state is not migrated; acceptable for demo). Keep up until 2026-11-25.

## Seed and demo
`npm run demo:seed` (in `relayer/` or `scripts/`): creates two accounts, runs one deal with seller_min 4M and buyer_max 4.6M (matches, then funds and releases) and a second with 5M and 4M (no deal). Prints the links. A split-screen page shows both sides of the seeded deal.

## Stack
| Item | Version | Why | Rejected |
|---|---|---|---|
| near-sdk | 5.30.1 | Current Rust SDK | near-sdk-js (archived) |
| cargo-near / near-cli-rs | 0.31.1 (cli) | Standard build/deploy | Hand-rolled wasm-opt |
| OutLayer WASM | wasm32-wasip2 | Only TEE with a path from a contract; no infra | Shade Agent (3-6 h Docker/Phala setup) |
| near-api-js | 7.4.0 | Verified current, widest examples; we need key gen, tx signing and view calls only | near-kit 0.20.2 (newer, fewer examples) |
| Vite + React + TS | UNVERIFIED version, pin at repo init | Matches brief | Next.js (no SSR need) |
| eciesjs | UNVERIFIED version | Used by private-dao-example | Own crypto |
| Node/TS + small HTTP lib | UNVERIFIED | Relayer is two endpoints | Serverless |
| Render | n/a | Per brief | Vercel |
| NEAR AI Cloud | `cloud-api.near.ai/v1` | E2EE inference with attestation | Local template parser (fallback) |
