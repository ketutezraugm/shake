# Team

Four roles. The team assigns people. Everyone reviews PRs outside their own area at least once a day.

## Roles
Marketplace plan from 2026-11-12 (docs/plans/IMPLEMENTATION.md). Freeze 2026-11-14 00:00 UTC.

**1. Contracts & TEE (Ezra).** Owns `contract/`, `tee/`, `app/src/contract.ts`, `app/src/crypto.ts`, `app/src/mockClient.ts`, `app/src/nearClient.ts`, `relayer/src/assistant*.ts`.
- 11-12 evening: MK-04 shared types v2, client crypto, mock chain v2 (unblocks FE).
- 11-13 morning: MK-01 contract v2 and MK-02 TEE v2, test-first. G2 at 12:00 UTC.
- 11-13 afternoon: MK-03 redeploy, build-lock move and the real `nearClient`; MK-05 AI product assistant.
- 11-14: freeze checks, contract id and WASM hash frozen, test contract dropped from the secret's readers.
- Provides: contract ABI, TS types, sealing helpers, TEE pubkey, WASM hash, assistant endpoint. Consumes: Supabase schema, relayer funding.

**2. Backend & integration (Harfi).** Owns `supabase/`, `relayer/` (except the assistant), sign-in screens and `app/src/accounts.ts`, `app/src/db.ts`, `.github/`, `render.yaml`, `scripts/demo-seed.mjs`, `e2e/`, README. Integrator: `/review-pr` first.
- 11-12 evening: MK-10 Supabase schema, RLS and storage; MK-13 types; D1-02 CI, D1-03 Render.
- 11-13 morning: D1-09/M1-08 accounts and limits, MK-11 JWT-bound accounts, MK-20 sign-in, handle and key export/import (one flow with MK-11), MK-12 sync and thread opening.
- 11-13 afternoon: MK-14 seed shop, MK-40 e2e, S-06 hosted.
- 11-14: P-01 README on a clean clone, repo public.
- Provides: Supabase project and types, relayer API, hosted URLs, `.env.example`. Consumes: contract ABI, seed photos.

**3. Frontend (Jose).** Owns `app/` (except the files roles 1 and 2 own).
- 11-12 evening: MK-21 browse, search and profile on Supabase (sign-in comes from Harfi's MK-20).
- 11-13 morning: MK-22 create listing on the mock client, MK-23 listing page with assistant and Q&A.
- 11-13 afternoon: MK-24 offer flow (swap in `nearClient` from MK-03), MK-25 chat and inbox.
- 11-14: fixes only.
- Provides: the UI. Consumes: TS types, relayer and DB types, tokens, Claude Design screens.

**4. Design & packaging (Abel).** Owns design assets under `app/src/design/`, `app/src/assets/`, `seed/`, and `docs/` visuals.
- 11-12 evening: MK-30 marketplace screens, home, listing and profile first.
- 11-13: remaining screens, MK-31 seed photos, recruit real sellers for S-08.
- 11-14: P-02 video, P-03 X post, P-05 submission.
- Provides: screens, assets, seed photos, video. Consumes: working builds.

Real-user recruiting and pitch: roles 2 and 4 lead.

## Shared contracts (changed only via PR)
1. Contract methods, `Listing`, `Deal` and the state enums (ARCHITECTURE.md; mirrored in `app/src/contract.ts`).
2. Commitment v2 strings and `tee/testvectors.json`.
3. Supabase schema and RLS (`supabase/migrations/`; generated `app/src/db.types.ts`).
4. Relayer API types (`relayer/src/types.ts`).
5. Design tokens (one `tokens.css`).
A PR that changes any of these needs the provider and one consumer to approve.

## Git workflow
Full rules: `docs/CONTRIBUTING.md`. In short: `main` = released product (release PRs from `dev` only), `dev` = integration (feature PRs only), task branches `<role>/<task-id>-<name>`; no force pushes, no direct pushes to `main`/`dev`, the Backend & Integration person's Claude reviews, integration-tests and squash-merges (`/review-pr`); Ezra can override anything.

## Daily sync
15 minutes, same time daily, in chat if not live. Each person posts: done since last sync, doing next, blocked on. One line each.

## Decisions
Anything that changes scope, a shared contract, or a stack choice goes in `docs/DECISIONS.md` (date, decision, reason, who). BUILD-BRIEF.md changes only by the lead.

## Escalation
Stuck for more than 1 hour: post in team chat with what you tried. If nobody answers in 15 minutes, tag the lead. Gates: G2 (contract and TEE v2 green) 11-13 12:00 UTC, G3 (offer flow on testnet) 11-13 20:00 UTC.
