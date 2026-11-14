# Team

Four roles. The team assigns people. Everyone reviews PRs outside their own area at least once a day.

## Roles
Marketplace plan, Revision B (2026-11-12): the deployed contract stays, listings use pre-created deals ("slots"), sign-in is Google/email or a NEAR wallet (docs/plans/IMPLEMENTATION.md). Freeze 2026-11-14 00:00 UTC.

**1. Contracts & TEE (Ezra).** Owns `contract/`, `tee/`, `app/src/contract.ts`, `app/src/crypto.ts`, `app/src/signer.ts`, `app/src/nearClient.ts`, `app/src/slots.ts`, `app/src/walletSigner.ts`, `relayer/src/assistant*.ts`, `scripts/marketplace-roundtrip.mjs`.
- 11-12 evening: MK-04 client crypto, signer, real contract client, slot helper (unblocks FE).
- 11-13 morning: MK-07 slot round trip on testnet (G2 at 12:00 UTC); MK-06 NEAR wallet login.
- 11-13 afternoon: MK-05 AI product assistant; help FE wire the offer flow.
- 11-14: freeze checks, contract id and WASM hash frozen, test contract dropped from the secret's readers.
- Provides: contract client, sealing and slot helpers, the `Signer` interface, wallet login, assistant endpoint, TEE pubkey, WASM hash. Consumes: relayer endpoints, migrations.

**2. Backend & integration (Harfi).** Owns `supabase/`, `relayer/` (except the assistant), Google/email sign-in (`app/src/auth.ts`, `app/src/accounts.ts`, `SignIn`, `Handle`, `Keys` screens), `.github/`, `render.yaml`, `scripts/demo-seed.mjs`, `e2e/`, README. Integrator: `/review-pr` first.
- 11-12 evening: MK-10 apply migration 0001, write and apply 0002 (profiles, questions, messages, `reserved`); D1-02 CI, D1-03 Render.
- 11-13 morning: MK-11 `POST /accounts` with Supabase JWT, MK-12 profiles, questions, messages, inbox endpoints and `reserved` sync, MK-20 Google/email sign-in.
- 11-13 afternoon: MK-14 seed shop, MK-40 e2e, S-06 hosted.
- 11-14: P-01 README on a clean clone, repo public.
- Provides: Supabase project, relayer API and types, hosted URLs, `.env.example`. Consumes: contract client, seed photos.

**3. Frontend (Jose).** Owns `app/` (except the files roles 1 and 2 own).
- 11-12 evening: MK-21 home, search and profile against the #35 endpoints.
- 11-13 morning: MK-22 create listing (uses `createSlots`), MK-23 listing page with assistant and Q&A.
- 11-13 afternoon: MK-24 offer flow, MK-25 chat and inbox (with the seller's "Round 2 requested" resubmit).
- 11-14: fixes only.
- Provides: the UI. Consumes: relayer types, contract client and `Signer`, tokens, Claude Design screens.

**4. Design & packaging (Abel).** Owns design assets under `app/src/design/`, `app/src/assets/`, `seed/`, and `docs/` visuals.
- 11-12 evening: MK-30 marketplace screens, home, listing and profile first, reusing the direction G offer, reveal, pay and proof frames.
- 11-13: remaining screens, MK-31 seed photos, recruit real sellers for S-08.
- 11-14: P-02 video, P-03 X post, P-05 submission.
- Provides: screens, assets, seed photos, video. Consumes: working builds.

Real-user recruiting and pitch: roles 2 and 4 lead.

## Shared contracts (changed only via PR)
1. Contract methods and the `State` enum (ARCHITECTURE.md; mirrored in `app/src/contract.ts`). The deployed contract does not change for the freeze.
2. v1 commitment strings and `tee/testvectors.json`.
3. Relayer API types (`relayer/src/types.ts`, imported by the app) and the signed-request format (`relayer/src/auth.ts`).
4. Supabase schema (`supabase/migrations/`), relayer-only.
5. The `Signer` interface (`app/src/signer.ts`), shared by both sign-in paths.
6. Design tokens (one `tokens.css`).
A PR that changes any of these needs the provider and one consumer to approve.

## Git workflow
Full rules: `docs/CONTRIBUTING.md`. In short: `main` = released product (release PRs from `dev` only), `dev` = integration (feature PRs only), task branches `<role>/<task-id>-<name>`; no force pushes, no direct pushes to `main`/`dev`, the Backend & Integration person's Claude reviews, integration-tests and squash-merges (`/review-pr`); Ezra can override anything.

## Daily sync
15 minutes, same time daily, in chat if not live. Each person posts: done since last sync, doing next, blocked on. One line each.

## Decisions
Anything that changes scope, a shared contract, or a stack choice goes in `docs/DECISIONS.md` (date, decision, reason, who). BUILD-BRIEF.md changes only by the lead.

## Escalation
Stuck for more than 1 hour: post in team chat with what you tried. If nobody answers in 15 minutes, tag the lead. Gates: G2 (slot round trip on testnet) 11-13 12:00 UTC, G3 (offer flow on testnet) 11-13 20:00 UTC.
