# Build brief (decisions summary for PRD / ARCHITECTURE / TEAM)

Written by the lead 2026-11-10. Drafts must follow this; flag disagreements, don't silently change them.

## Product
Blind deal (name TBD): buyer and seller each set a private price limit; code in a TEE compares them; if ranges overlap, the deal closes at a **random price inside the overlap** (midpoint would leak the other's limit); otherwise "no deal" and nothing else leaks. Deal is binding; buyer pays into an escrow contract released on "Received", refunded after a deadline. Full user flow and trust model: docs/IDEAS.md (end). Identity: docs/IDENTITY.md.

## Tracks
Default `privacy` + `realworld`. Switch the second to `agents` only if the AI negotiator (S-02) ships by the feature freeze.

## Scope
**Must (demo slice, M1 = end of 11-11, hard by noon 11-12):**
1. Seller creates a deal (item title, short description) and gets a buyer link (one buyer per link).
2. Walletless accounts: browser generates an ed25519 key; relayer creates `name.<app>.testnet` with that key as full-access key and funds it with a little testnet NEAR (enough for gas + demo escrow).
3. Each side enters a numeric limit. Browser encrypts it to the TEE's public key; contract stores ciphertext + a commitment hash.
4. When both are in, the contract calls OutLayer (`outlayer.testnet`, `request_execution`) with both ciphertexts; the WASM decrypts, compares, picks a random price in [seller_min, buyer_max] with TEE randomness, returns only `{matched, price}`; callback stores the result. Pattern: github.com/out-layer/private-dao-example.
5. Reveal screen on both phones (poll contract view), with the signature reveal.
6. Escrow: buyer deposits price; "Received" releases to seller; refund after deadline. No admin key.
7. Private rounds: the seller picks 1, 2 or 3 rounds per buyer (default 2). After a no-deal, both sides may resubmit; the buyer can only raise, the seller can only lower (checked in the TEE). Each round reveals only deal / no deal; a deal ends the negotiation and is binding.
8. Hosted demo + README a judge can follow ("do X, see Y"), including a seeded demo deal pair.

**Should (11-12..13):** AI negotiator: natural-language limits/conditions parsed by NEAR AI Cloud private inference with E2EE + attestation (then tag `agents`); attestation / "Verified" panel (fresh nonce) showing OutLayer + NEAR AI proofs; deal receipt page with tx links; Bahasa/English copy; 10-20 real deals with real students logged.

**Could:** pay from another chain via NEAR Intents 1Click; dispute flow; connect an existing NEAR wallet (HOT / NEAR Connect); item photo.

**Won't:** mainnet, real money, native app, accounts recovery beyond "export key".

## Stack (versions from raw/sponsor-tech.md, verified 2026-11-09)
- Contract: Rust, near-sdk 5.30.1, cargo-near; testnet. (near-sdk-js is archived.)
- TEE logic: OutLayer WASM (Rust). Fallback if the OutLayer spike fails by end of 11-11: a matching service whose signing key is registered in the contract (trust stated in README), then commit-reveal.
- Frontend: Vite + React + TypeScript SPA, near-api-js 7.4.0 (or near-kit 0.20.2: pick one in architecture). Mobile-first.
- Relayer: small Node/TypeScript HTTP service (account creation + funding). Rate-limit per IP.
- No database: the contract is the source of truth. (Ponytail: skip Supabase unless a need appears.)
- Deploy: Render (static site for the SPA, web service for the relayer). Keep up until 2026-11-25.
- No icon/illustration/animation libraries; motion with CSS using IDENTITY.md tokens.

## Risks to cover in the register
OutLayer unknowns (ECIES with PROTECTED_ secrets, testnet workers, fees); browser-held keys; relayer abuse (account farming); testnet faucet dry; two-sided demo needs two devices (seeded demo + split-screen page); strategic misreporting (state Myerson–Satterthwaite limit); OutLayer centralisation (state it); time.

## Timeline
| Day | Goal |
|---|---|
| 11-10 | Identity locked; PRD/arch/team; repo + CI + Render hello-world; OutLayer spike (2-3 h); relayer spike; Abel designs screens |
| 11-11 | Contract + WASM end-to-end on testnet; frontend flow on mocks, then wired. **M1 demo slice EOD** |
| 11-12 | Escrow polish, attestation panel, AI negotiator, hosted; start real deals |
| 11-13 | **Feature freeze 12:00 UTC.** Real deals, video, README, X post draft |
| 11-14 | Repo public, X post live, submit by 12:00 UTC |

## Team (4 roles; the team assigns names)
1. Contracts & TEE: Rust contract, OutLayer WASM, contract tests.
2. Backend & integration: relayer, NEAR AI Cloud, deploy/CI, README reproducibility, demo seed.
3. Frontend: React app implementing the Claude Design output faithfully, motion, states.
4. Design & packaging (Abel): Claude Design screens and assets, video, X post visuals.
Shared: real-user recruiting and pitch (roles 2 and 4 lead), daily sync.
