# Team

Four roles. The team assigns people. Everyone reviews PRs outside their own area at least once a day.

## Roles
**1. Contracts & TEE.** Owns `contract/`, `tee/`.
- 11-10: OutLayer spike (random-example call, then ECIES with a PROTECTED_ secret); contract skeleton with method signatures.
- 11-11: contract + WASM end-to-end on testnet; contract tests. M1.
- 11-12: escrow edge cases, fallback decision executed if spike failed; attestation data for the panel.
- 11-13: bug fixes only; WASM hash published in README.
- 11-14: final testnet deploy confirmed, contract id frozen.
- Provides: contract ABI, TEE public key, WASM hash. Consumes: relayer funding, app test feedback.

**2. Backend & integration.** Owns `relayer/`, `.github/`, `render.yaml`, README, demo seed.
- 11-10: repo, CI, Render hello-world; relayer spike (account create + fund).
- 11-11: relayer with rate limits; seed script against the contract.
- 11-12: NEAR AI Cloud integration (Should); hosted deploy; README steps.
- 11-13: README tested on a clean clone by someone not on the team; seed verified.
- 11-14: deploy checked, repo public.
- Provides: relayer API, hosted URLs, `.env.example`. Consumes: contract ABI.

**3. Frontend.** Owns `app/`.
- 11-10: Vite app, routing, key generation, mock client matching the contract ABI.
- 11-11: full flow on mocks, then wired to testnet.
- 11-12: reveal motion, Verified panel, error and loading states.
- 11-13: polish, mobile pass, Bahasa/English if time.
- 11-14: no new work; fix blockers.
- Provides: the UI. Consumes: contract ABI, relayer types, design tokens, Claude Design screens.

**4. Design & packaging.** Owns design assets under `app/src/design/` (tokens) and `docs/` visuals.
- 11-10: screens in Claude Design; tokens file from IDENTITY.md.
- 11-11: screens handed to frontend; assets.
- 11-12: attestation panel and receipt screens; recruit real users with role 2.
- 11-13: video, X post visuals, pitch text.
- 11-14: X post live, submission.
- Provides: tokens, screens, assets, video. Consumes: working app builds.

Real-user recruiting and pitch: roles 2 and 4 lead.

## Shared contracts (defined 11-10 / start of 11-11, changed only via PR)
1. Contract method signatures and the `State` enum (ARCHITECTURE.md; mirrored in `app/src/contract.ts`).
2. Relayer API types (`relayer/src/types.ts`, imported by the app).
3. Design tokens from docs/IDENTITY.md (one `tokens.css` file).
4. OutLayer request/response JSON.
A PR that changes any of these needs both the provider and one consumer to approve.

## Git workflow
Full rules: `docs/CONTRIBUTING.md`. In short: `main` = released product (release PRs from `dev` only), `dev` = integration (feature PRs only), task branches `<role>/<task-id>-<name>`; no force pushes, no direct pushes to `main`/`dev`, 1 reviewer + green CI, the author squash-merges, a human always merges.

## Daily sync
15 minutes, same time daily, in chat if not live. Each person posts: done since last sync, doing next, blocked on. One line each.

## Decisions
Anything that changes scope, a shared contract, or a stack choice goes in `docs/DECISIONS.md` (date, decision, reason, who). BUILD-BRIEF.md changes only by the lead.

## Escalation
Stuck for more than 1 hour: post in team chat with what you tried. If nobody answers in 15 minutes, tag the lead. The OutLayer fallback decision is made by end of 11-11.
