# Build brief (decisions summary for PRD / ARCHITECTURE / TEAM)

Written by the lead 2026-11-10, revised 2026-11-12 for the marketplace pivot (design: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md). Drafts must follow this; flag disagreements, don't silently change them.

## Product
Shake (formerly Blind deal; name approved in #42): a second-hand marketplace where every listing shows an asking price but the seller's real floor stays sealed. Sellers link their shop (`/@handle`) from their Instagram or marketplace bio; listings have photos, details, an AI product assistant and public Q&A. The seller seals a minimum per listing; each buyer makes a blind offer; code in a TEE compares them; on an overlap the deal closes at a **random price inside the overlap** (midpoint would leak the other's limit), otherwise the buyer sees "no deal" and nothing else. Deal is binding; buyer pays into an escrow contract released on "Received", refunded after a deadline. Chat opens only after a deal. Identity: docs/IDENTITY.md (Abel).

## Tracks
Tag every track the project honestly fits (no cap, verified 2026-11-12). Proposal: `privacy`, `agents` (AI product assistant; negotiator if it ships), `realworld`. Final list at submission, by the team.

## Scope
Full list with acceptance criteria: docs/PRD.md. **Must by the freeze (2026-11-14 00:00 UTC):** sign-in with Google or email (browse, ask the assistant, public questions) or a NEAR wallet (sell, offer, pay); seller profile `/@handle`; create listing with photos and a sealed minimum; public browse and search; listing page with AI assistant and public Q&A; blind offer through up to 10 slots per listing, seller-chosen rounds (1-3), buyer only raises; match reserves the listing, escrow, "Received" marks it Sold; chat after a match; in-app inbox; seeded demo shop; hosted demo + README.
**Should:** AI negotiator, Verified panel, seller lowers the minimum, ratings, saved items, email notifications, E2EE prompts, real listings by real students.
**Could:** pay from another chain via 1Click; dispute flow; connect an existing wallet; Bahasa toggle.
**Won't:** mainnet, real money, native app, shipping, payments outside escrow, account recovery beyond "export key".

## Stack (versions from raw/sponsor-tech.md, verified 2026-11-09)
- Contract: Rust, near-sdk 5.30.1, cargo-near; testnet. (near-sdk-js is archived.)
- TEE logic: OutLayer WASM (Rust). Fallback if the OutLayer spike fails by end of 11-11: a matching service whose signing key is registered in the contract (trust stated in README), then commit-reveal.
- Frontend: Vite + React + TypeScript SPA, near-api-js 7.4.0 (or near-kit 0.20.2: pick one in architecture). Mobile-first.
- Relayer: small Node/TypeScript HTTP service: account creation behind a Supabase JWT, AI assistant proxy to NEAR AI Cloud, listing-state sync, chat opening. Rate limits per IP and per user.
- Supabase (Auth, Postgres, Storage) for descriptive marketplace data, reached only through the relayer; the app uses it for Auth only. The deployed contract stays the source of truth for money, sealed limits and deals, unchanged: listings use pre-created deals ("slots", PR #35). (The need appeared with the pivot.)
- Sign-in: Google/email (Supabase Auth, no NEAR account; browse and ask only) or a NEAR wallet via NEAR Connect (sell, offer, pay; the user pays their own fees). The relayer holds no key and funds nothing.
- Deploy: Render (static site for the SPA, web service for the relayer). Keep up until 2026-11-25.
- No icon/illustration/animation libraries; motion with CSS using IDENTITY.md tokens.

## Risks to cover in the register
OutLayer unknowns (ECIES with PROTECTED_ secrets, testnet workers, fees); browser-held keys; relayer abuse (account farming); testnet faucet dry; two-sided demo needs two devices (seeded demo + split-screen page); strategic misreporting (state Myerson–Satterthwaite limit); OutLayer centralisation (state it); Sybil probing of a listing's minimum (10-offer cap, one account per user); RLS mistakes leaking chat; time.

## Timeline
| Day | Goal |
|---|---|
| 11-10..11 | Done: identity, docs, OutLayer spike, contract + WASM end to end on testnet (G1 passed) |
| 11-12 | Pivot planned; shared types v2, Supabase schema, screens in Claude Design |
| 11-13 | Slot round trip on testnet (G2 12:00 UTC), relayer endpoints, both sign-ins, screens, assistant, seed, hosting (G3 20:00 UTC) |
| 11-14 | **Feature freeze 00:00 UTC.** README, video, X post; submit by 12:00 UTC |

## Team (4 roles; the team assigns names)
1. Contracts & TEE: Rust contract, OutLayer WASM, contract tests, TS contract client, slot helper, NEAR wallet login, AI assistant.
2. Backend & integration: Supabase, relayer, sign-in, deploy/CI, README reproducibility, demo seed.
3. Frontend: React app implementing the Claude Design output faithfully, motion, states.
4. Design & packaging (Abel): Claude Design screens and assets, video, X post visuals.
Shared: real-user recruiting and pitch (roles 2 and 4 lead), daily sync.
