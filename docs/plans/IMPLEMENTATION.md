# Blind Deal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the M1 demo slice by end of 11-11, Should items 11-12, packaging and submission by 11-14 12:00 UTC.

**Architecture:** Contract is the source of truth (no DB). Browser encrypts limits to a TEE key; contract calls OutLayer WASM, stores `{matched, price}`, runs escrow. Relayer only creates and funds accounts. Frontend builds on a mock `ContractClient` until the contract is deployed.

**Tech Stack:** Rust near-sdk 5.30.1, OutLayer WASM (wasm32-wasip2), Vite + React + TS, near-api-js 7.4.0, eciesjs (pin at init), Node/TS relayer, Render, GitHub Actions.

**Spec:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TEAM.md`, `docs/DECISIONS.md`, `docs/BUILD-BRIEF.md`, `docs/IDENTITY.md`.

## Global Constraints

- Today 2026-11-10. Freeze 2026-11-13 12:00 UTC. Submit by 2026-11-14 12:00 UTC. M1 hard stop noon 11-12.
- Testnet only. No admin key; `outlayer` is set in `new`, no setter. Callback accepted only from `outlayer.testnet`.
- Rate `rp_per_near` default 10,000,000. Limits are decimal strings in Rupiah. Same bytes hashed on client and TEE: `sha256(limit, salt)`.
- Plaintext in each ciphertext: `{"deal_id","side","limit","salt"}`; WASM rejects deal_id or side mismatch with `{"deal_id":N,"error":"invalid"}`.
- Relayer: 3 accounts per IP per hour, global daily cap, 503 when low; never sees limits or secret keys.
- Motion: only `transform`/`opacity`, tokens from IDENTITY.md; no icon, illustration or animation libraries; fonts self-hosted woff2.
- Never commit private keys, `.env`, OutLayer payment key. Commit `.env.example` only.
- No AI attribution in commits or PRs. Conventional commits, short branches, PR + 1 review + green CI to `main`. After freeze: fixes only.

## Review Focus

Each line has its pinning test in the owning task.
1. Replayed ciphertext (seller ct as buyer, or into another deal) must return `invalid` (M1-05).
2. Buyer link opened a second time shows "link used", no second submit (M1-02).
3. Wrong-amount deposit, wrong caller, wrong state all panic (M1-04).
4. Malformed or missing OutLayer result lands in `NoDeal`, never stuck in `Computing` (M1-03).
5. Equal limits (min == max) matches at exactly that price; limit 0 and non-numeric input rejected (M1-05).

## Roles

CT = Contracts & TEE. BI = Backend & integration. FE = Frontend. DP = Design & packaging.

## Critical path

D1-08 (OutLayer spike) -> M1-05/06 (WASM + deploy) -> M1-07 (contract on testnet with callback) -> M1-11 (frontend wired) -> M1-13 (e2e happy path) -> G1 (gate) -> S-06 (hosted) -> P-01 (README on clean clone) -> P-04 (submit).

**Riskiest dependency:** OutLayer (ECIES with `PROTECTED_` secret, testnet worker availability, fee). Everything on the path above sits behind it. Gate G1 switches to the fallback matcher if the spike or M1-07 fails.

## Cut list (drop first, in order)

1. Bahasa/English (S-04). 2. Real-deal count below 10 (S-08). 3. Enclave-signed results (S-07). 4. AI negotiator (S-02; tag becomes `realworld`). 5. Receipt page (S-03). 6. Verified panel nonce (keep static hash display). Never cut: M1, README gate, hosted demo, seed.

---

# Day 1: 2026-11-10 (scaffold, shared contracts, spikes)

### D1-01 Monorepo scaffold
- **Owner:** BI. **Deps:** none.
- **Files:** `package.json` (workspaces `app`, `relayer`), `Cargo.toml` (workspace `contract`, `tee`), `contract/`, `tee/`, `app/`, `relayer/`, `.gitignore`, `.env.example`.
- **Done:** `npm ci && npm run build --workspaces` exits 0; `cargo test --workspace` prints `test result: ok. 0 passed`.

### D1-02 CI
- **Owner:** BI. **Deps:** D1-01.
- **Files:** `.github/workflows/ci.yml` (cargo test contract+tee, typecheck, lint, build app+relayer).
- **Done:** a PR with a trivial change shows all jobs green in `gh pr checks`; a deliberate type error turns it red.

### D1-03 Render hello-world
- **Owner:** BI. **Deps:** D1-01.
- **Files:** `render.yaml` (static site `app/` with SPA rewrite; web service `relayer/`; secrets `sync: false`), `relayer/src/index.ts` (`GET /health`).
- **Done:** `curl -s https://<relayer>.onrender.com/health` prints `{"ok":true}`; app URL returns 200 and a deep link `/d/1` also returns 200.

### D1-04 Contract stub (signatures)
- **Owner:** CT. **Deps:** D1-01.
- **Files:** `contract/src/lib.rs` with `State`, `Deal`, and every method from ARCHITECTURE.md as `unimplemented!()` bodies.
- **Produces:** `new(outlayer, tee_pubkey)`, `create_deal(title, description, link_hash) -> u64`, `submit_limit(deal_id, ct, commit, link_token)`, `on_outlayer_result(deal_id)`, `deposit`, `confirm_received`, `refund`, `cancel`, `expire`, `get_deal`, `get_state`.
- **Done:** `cargo check -p contract` exits 0.

### D1-05 Shared TS contract types
- **Owner:** CT. **Deps:** D1-04.
- **Files:** `app/src/contract.ts` (`State` union, `Deal`, `ContractClient` interface mirroring the methods, `OutLayerRequest`/`OutLayerResponse`), `tee/testvectors.json` (empty skeleton).
- **Produces:** `ContractClient` consumed by FE mock (D1-10) and real client (M1-11).
- **Done:** `npm run typecheck -w app` exits 0.

### D1-06 Relayer API types
- **Owner:** BI. **Deps:** D1-01.
- **Files:** `relayer/src/types.ts` (`CreateAccountReq {name, publicKey}`, `CreateAccountRes {accountId}`, error codes 409/429/503).
- **Done:** `npm run typecheck -w relayer` and the app imports it with exit 0.

### D1-07 Design tokens CSS
- **Owner:** DP. **Deps:** D1-01.
- **Files:** `app/src/design/tokens.css` (all color, motion, spacing, radius, type-scale tokens from IDENTITY.md, `prefers-reduced-motion` block), `app/public/fonts/` (Big Shoulders Display, Familjen Grotesk woff2).
- **Done:** `grep -c -E -e '--(ground|surface|check|line|ink|ink-muted|tag|danger|dur-instant|dur-quick|dur-deliberate|dur-reveal|ease-out|ease-in|ease-std):' app/src/design/tokens.css` prints `15`.

### D1-08 OutLayer spike (2-3 h, time-boxed)
- **Owner:** CT. **Deps:** D1-01.
- **Steps:** (1) run random-example on testnet via `request_execution`; (2) build a WASM that reads a `PROTECTED_` secret, derives a keypair, returns the pubkey for `get_pubkey`; (3) encrypt in a node script with eciesjs, decrypt in WASM; (4) record testnet worker availability and the fee attached.
- **Files:** `tee/` (spike code), `docs/DECISIONS.md` (new entry with the answers and the real request/response field names, replacing UNVERIFIED).
- **Done:** `node scripts/spike-ecies.mjs` prints `decrypted: {"limit":"4000000"}` from an OutLayer execution on testnet; DECISIONS.md lists worker availability, fee in NEAR, and field names. If step 3 is not working by hour 3, post in chat and tag the lead.

### D1-09 Relayer spike
- **Owner:** BI. **Deps:** D1-03, D1-06.
- **Files:** `relayer/src/accounts.ts` (create `name.<parent>.testnet` with the given public key as full-access key, fund `FUND_AMOUNT`). Parent account created once the name is final (kodejari.testnet candidate).
- **Done:** `curl -X POST $RELAYER/accounts -d '{"name":"t1","publicKey":"ed25519:..."}'` returns `{"accountId":"t1.<parent>.testnet"}` and `near account view-account-summary t1.<parent>.testnet network-config testnet now` shows a nonzero balance, within 15 s.

### D1-10 Frontend skeleton on mocks
- **Owner:** FE. **Deps:** D1-05, D1-07.
- **Files:** `app/src/main.tsx`, `app/src/routes.tsx` (`/`, `/d/:id`, `/d/:id/join`, `/demo`), `app/src/keys.ts` (ed25519 gen, localStorage, export key), `app/src/mockClient.ts` (in-memory `ContractClient`), `app/src/keys.test.ts`.
- **Done:** `npm test -w app -- keys` passes (key survives reload simulation, secret key never in any outgoing fetch body); `npm run dev -w app` serves the route shells.

### D1-11 Screens in Claude Design
- **Owner:** DP. **Deps:** D1-07.
- **Files:** Design artifact seeded with IDENTITY.md, tokens, brief and copy; list of screens (create, link, enter limit, waiting, reveal, no deal, escrow, receipt) in `docs/plans/screens.md` only if links need recording.
- **Done:** all 8 screens exist as phone-width frames; link shared in team chat; FE confirms it can read them.

---

# Day 2: 2026-11-11, Milestone M1 (demo slice)

### M1-01 Contract: `new` + `create_deal` (TDD)
- **Owner:** CT. **Deps:** D1-04.
- **Files:** `contract/src/lib.rs`, `contract/tests/deal.rs`.
- **Tests first:** `create_deal_returns_incrementing_ids`, `title_and_description_length_bounded`, `get_deal_hides_nothing_secret` (no plaintext field exists).
- **Done:** `cargo test -p contract create_deal` prints `3 passed`.

### M1-02 Contract: `submit_limit`, link token, one attempt (TDD)
- **Owner:** CT. **Deps:** M1-01.
- **Tests first:** `seller_first_moves_to_seller_in`, `buyer_needs_matching_token_hash`, `second_buyer_submit_fails`, `used_link_rejected`, `buyer_submit_moves_to_computing_and_calls_outlayer` (checks promise to `outlayer`), `cancel_blocked_once_matched`.
- **Done:** `cargo test -p contract submit_limit` all pass; `cargo test -p contract cancel` passes.

### M1-03 Contract: `on_outlayer_result` (TDD)
- **Owner:** CT. **Deps:** M1-02.
- **Tests first:** `matched_result_sets_matched_price_and_matched_at`, `no_match_sets_nodeal_without_price`, `malformed_result_sets_nodeal`, `callback_from_other_account_rejected`.
- **Done:** `cargo test -p contract on_outlayer` prints `4 passed`.

### M1-04 Contract: escrow (TDD)
- **Owner:** CT. **Deps:** M1-03.
- **Tests first:** `deposit_exact_price_funds` (price converted at `rp_per_near`), `deposit_wrong_amount_panics`, `deposit_wrong_caller_panics`, `confirm_received_pays_seller`, `confirm_wrong_caller_or_state_panics`, `refund_after_deadline_pays_buyer`, `refund_before_deadline_panics`, `expire_after_24h_unfunded`, `no_owner_method_exists` (ABI listing contains no admin method).
- **Done:** `cargo test -p contract escrow` all pass; `cargo test -p contract` fully green.

### M1-05 WASM matching + commitment (TDD)
- **Owner:** CT. **Deps:** D1-08.
- **Files:** `tee/src/lib.rs` (`fn run_match(input, key) -> Response`), `tee/src/commit.rs`, `tee/tests/match.rs`, `tee/testvectors.json` (ciphertext, limit, salt, commit shared with the frontend).
- **Tests first:** `overlap_matches_price_in_range` (min 4M, max 4.6M, 1000 draws all in range), `no_overlap_returns_no_price` (5M vs 4M), `equal_limits_match_exact`, `zero_or_nonnumeric_limit_invalid`, `commit_mismatch_invalid`, `seller_ct_as_buyer_invalid`, `wrong_deal_id_invalid`.
- **Done:** `cargo test -p tee` offline prints `7 passed`.

### M1-06 WASM: `get_pubkey`, build, deploy to OutLayer
- **Owner:** CT. **Deps:** M1-05.
- **Files:** `tee/src/main.rs`, `tee/README` section in root README later.
- **Done:** `cargo build -p tee --target wasm32-wasip2 --release` exits 0; `scripts/get-pubkey.mjs` prints the TEE pubkey hex from a real OutLayer run; WASM sha256 recorded in DECISIONS.md.

### M1-07 Contract on testnet + OutLayer round trip
- **Owner:** CT. **Deps:** M1-04, M1-06.
- **Files:** `scripts/deploy-contract.sh`, `scripts/roundtrip.mjs`.
- **Done:** `node scripts/roundtrip.mjs` creates a deal, submits seller 4000000 and buyer 4600000, then prints `state=Matched price in [4000000,4600000]` within 60 s; a second run with 5000000 vs 4000000 prints `state=NoDeal`. Contract id and TEE pubkey posted for `VITE_*` env.

### M1-08 Relayer with rate limits
- **Owner:** BI. **Deps:** D1-09.
- **Files:** `relayer/src/ratelimit.ts`, `relayer/src/index.ts`, `relayer/test/limit.test.ts`.
- **Done:** `npm test -w relayer` passes one check: 3 requests from one IP return 201, the 4th returns 429; duplicate name returns 409; low balance returns 503.

### M1-09 Frontend flow on mocks
- **Owner:** FE. **Deps:** D1-10, D1-11.
- **Files:** `app/src/screens/*` (Create, Link, EnterLimit, Waiting, Reveal, Escrow), `app/src/styles/*` using tokens only, `app/src/screens/reveal.css` (cloth lift 600 ms, tag swing 300 ms, reduced-motion crossfade).
- **Done:** `npm test -w app -- flow` passes: with `mockClient` seller 4M, buyer 4.6M reaches Reveal showing one price and no other number; 5M vs 4M shows only "No deal"; reload of an already-used link shows "link used".

### M1-10 Frontend ECIES + commitment
- **Owner:** FE. **Deps:** D1-05, M1-05 (test vectors).
- **Files:** `app/src/crypto.ts` (`encryptLimit(side, dealId, limit, teePubkey) -> {ct, commit}`), `app/src/crypto.test.ts`.
- **Done:** `npm test -w app -- crypto` passes: `commit` equals the vector from `tee/testvectors.json`; the vector ciphertext decrypts in `cargo test -p tee` (same file).

### M1-11 Wire frontend to testnet
- **Owner:** FE. **Deps:** M1-07, M1-08, M1-09, M1-10.
- **Files:** `app/src/nearClient.ts` (real `ContractClient`, 3 s polling of `get_deal`), `app/src/accounts.ts` (relayer call with public key only), env `VITE_*`.
- **Done:** from a fresh browser profile with no wallet, `npm run dev -w app`, creating a deal and joining in a second profile reaches the reveal on both within 5 s of the callback.

### M1-12 Seed script
- **Owner:** BI. **Deps:** M1-07, M1-08.
- **Files:** `scripts/demo-seed.mjs`, `app/src/screens/Demo.tsx` (split screen, route `/demo`), root `package.json` script `demo:seed`.
- **Done:** `npm run demo:seed` prints two links and `matched price=... released` and `no deal`; `/demo?deal=<id>` shows both sides.

### M1-13 End-to-end happy path (one test)
- **Owner:** BI. **Deps:** M1-11, M1-12.
- **Files:** `e2e/happy.spec.ts` (playwright, two browser contexts).
- **Done:** `npx playwright test e2e/happy.spec.ts` passes: create -> join -> same reveal on both pages -> deposit -> "Received" -> seller balance increased, in under 3 min.

### M1-14 Hand screens and assets to frontend
- **Owner:** DP. **Deps:** D1-11.
- **Files:** `app/src/design/assets/*` (ear tag, hand, escrow box SVGs, 24 px grid).
- **Done:** FE merges assets; `npm run build -w app` exits 0 with no asset over 20 KB.

### G1 Decision gate: end of 11-11 (owner: lead, CT reports)
- **Pass:** M1-07 and M1-13 green. Proceed to Should.
- **Fail (spike or round trip not working):** execute fallback below on 11-12 morning, and record in DECISIONS.md.

### F-01 Fallback matcher (contingent)
- **Owner:** CT. **Deps:** G1 fail.
- **Files:** `matcher/` (small service reusing `tee/src/commit.rs` logic and `run_match`), `contract/src/lib.rs` (verify ed25519 signature from a key set in `new`, replace the OutLayer call), README trust paragraph.
- **Done:** `cargo test -p contract matcher_signed_result_accepted` and `matcher_wrong_signature_rejected` pass; `node scripts/roundtrip.mjs` prints the same Matched/NoDeal lines. Commit-reveal is the last resort and is not planned here.

---

# Day 3: 2026-11-12 (Should items; M1 must be done by noon)

### S-01 Verified panel
- **Owner:** CT (data), FE (UI). **Deps:** M1-06, M1-11.
- **Files:** `tee/src/main.rs` (`attest` action with fresh nonce), `app/src/screens/Verified.tsx`.
- **Done:** opening the panel shows the WASM sha256 equal to the DECISIONS.md hash and a nonce that differs on each open (`npm test -w app -- verified`).

### S-02 AI negotiator (NEAR AI Cloud)
- **Owner:** BI (proxy), FE (UI). **Deps:** M1-11; ask organizers about credit first.
- **Files:** `relayer/src/nearai.ts` (adds API key, forwards E2EE payload), `app/src/negotiator.ts` (text to `{min}` or `{max}`).
- **Done:** `npm test -w app -- negotiator` passes one check: "not below 4M, charger included" returns `{min: 4000000}`; relayer logs contain no plaintext prompt. Fallback is a local template parser; tag stays `realworld` if it is cut.

### S-03 Receipt page with tx links
- **Owner:** FE. **Deps:** M1-11.
- **Files:** `app/src/screens/Receipt.tsx`.
- **Done:** after release, `/d/:id/receipt` shows Paid/Refunded and explorer links that return 200.

### S-04 Bahasa/English
- **Owner:** FE, DP (copy). **Deps:** M1-09.
- **Files:** `app/src/i18n.ts`, `app/src/locales/{id,en}.json`.
- **Done:** `npm test -w app -- i18n` passes: every key exists in both files; toggle switches "Cocok!" and its English copy.

### S-05 Escrow edge cases and testnet redeploy
- **Owner:** CT. **Deps:** M1-04.
- **Done:** `cargo test -p contract` green with added `deposit_after_expire_panics` and `refund_by_third_party_pays_buyer`; `node scripts/roundtrip.mjs --escrow` prints `released` and `refunded` paths.

### S-06 Hosted deploy
- **Owner:** BI. **Deps:** M1-13, S-05.
- **Files:** `render.yaml`, Render env vars.
- **Done:** hosted app URL passes `npx playwright test e2e/happy.spec.ts` with `BASE_URL` set; `curl $RELAYER/health` returns `{"ok":true}`.

### S-07 Enclave-signed results (only if spike showed PROTECTED_ can sign)
- **Owner:** CT. **Deps:** G1 pass.
- **Done:** `cargo test -p contract signed_result_verified` and `unsigned_result_rejected` pass.

### S-08 Real deals
- **Owner:** BI and DP (lead). **Deps:** S-06.
- **Files:** `docs/real-deals.md` (counts: started, matched, "would have failed to start").
- **Done:** 10 logged deals, each with a tx link that resolves.

### S-09 Reveal and state polish
- **Owner:** FE. **Deps:** M1-09, M1-14.
- **Done:** `npm test -w app -- reveal` passes (reduced-motion renders crossfade class; "No deal" shows no tag nodes); manual: loading and error states exist for every network call.

---

# Day 4: 2026-11-13 (freeze 12:00 UTC) and packaging

### P-01 README on a clean clone
- **Owner:** BI. **Deps:** S-06.
- **Files:** `README.md` ("do X, see Y" with `npm run demo:seed`, hosted URL, WASM hash, centralisation and Myerson-Satterthwaite limits, fee hypothesis marked UNVERIFIED).
- **Done:** a person outside the team follows it on a clean machine and reaches the reveal, reported in chat.

### P-02 Video and visuals
- **Owner:** DP. **Deps:** S-06.
- **Files:** `docs/media/demo.mp4`, X post image.
- **Done:** video is 90 s or less, shows reveal and escrow; file plays on a phone.

### P-03 X post draft and pitch text
- **Owner:** DP, BI. **Deps:** P-02.
- **Done:** draft approved in chat; track tag decided (`agents` only if S-02 shipped).

### P-04 Freeze and final checks (12:00 UTC)
- **Owner:** CT, BI. **Deps:** all.
- **Done:** `git tag freeze-1` on `main`; `cargo test --workspace` and `npm test --workspaces` green; contract id and WASM hash in README match `near contract` view.

# Day 5: 2026-11-14 (submit by 12:00 UTC)

### P-05 Submit
- **Owner:** DP (post, submission), BI (repo public), CT (contract id frozen). **Deps:** P-04.
- **Done:** `gh repo view --json visibility` prints `PUBLIC`; hosted `/health` and app return 200; X post live; submission confirmation saved.
