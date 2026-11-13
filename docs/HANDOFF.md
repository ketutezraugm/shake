# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Teammate sessions:** first time on a machine, type `/onboard`. Every session after: `/inbox` to start, `/ship` per task, `/handoff` to stop. Role comes from your GitHub login (.github/ROLES); no placeholders.
**Team update (Ezra):** `/handoff team` prints a paste-ready status for the team chat.

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze **2026-11-14 00:00 UTC** (moved by the pivot). Gates G2 11-13 12:00 UTC, G3 11-13 20:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles: Harfi (SyuraMoons) Backend & Integration + integrator; Ezra (ketutezraugm) Contracts & TEE + owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Mapping in .github/ROLES.
- Idea: **Shake** (formerly Blind deal; name approved in #42). **Pivoted 2026-11-12** to a second-hand marketplace: shop link in the seller's bio, listings with photos and an asking price (the seller's floor stays sealed), AI product assistant + public Q&A, blind offers through up to 10 pre-created deals ("slots") per listing on the unchanged contract, escrow, chat after a deal, sign-in with Google/email or a NEAR wallet. Supabase behind the relayer for descriptive data, contract for money. Design: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md; plan: docs/plans/IMPLEMENTATION.md (MK-xx). Tracks: tag every one that fits (no cap); proposal privacy, agents, realworld.
- Submission: one shot, only after repo public + X demo post live. AI screening checks the README reproduces.
- Identity locked: docs/IDENTITY.md (marosok layout, security-tint blue + carbon-copy yellow).

## Lead / planning
- **Buyer and seller roles (decided 2026-11-13):** a sign-up choice between selling and buying, My offers, saved items on this device, a seller sales view, and two escrow exits the app promised but never offered (refund after the deadline, reopening a listing the buyer never paid for). Abel draws the frames first (MK-50), Jose builds MK-51, MK-52, MK-55 and MK-56, and Ezra builds MK-53 and MK-54. No relayer, contract or schema change. Spec: `docs/superpowers/specs/2026-11-13-buyer-side-design.md`.
- **Status:** 2026-11-12: marketplace pivot planned (Revision B: Harfi's slots on the unchanged contract, Google/email and NEAR wallet sign-in) and written into PRD, ARCHITECTURE, DATA-MODEL, IMPLEMENTATION, PROGRESS, TEAM, TEAM-HANDOFF, BUILD-BRIEF, DESIGN-BRIEF (product parts only), PACKAGING, ENDGAME, DECISIONS (PR from `lead/marketplace-pivot`). Identity and visual design not redone (Abel).
- **Lead duties during the build (Ezra):** `/handoff team` once a day; call gates G2 (slot round trip, 11-13 12:00 UTC) and G3 (11-13 20:00 UTC); approve releases; freeze 11-14 00:00 UTC; submit 11-14 12:00 UTC (checklist: docs/ENDGAME.md Phase 11).
- **Open:** product name (blocks the parent account, README, logo); whether one project can win several tracks (rules silent; ask organizers); claim the $10 NEAR AI key at nearbuilders.org/dashboard (MK-05); competitor re-scan done 11-13 (docs/research/COMPETITORS.md: no second-hand marketplace with a sealed floor among 783 entries; "sealed" is a crowded word).
- **Before submission:** humanizer pass on README + write-up (docs/PACKAGING.md); regenerate the team PDF only if the team asks (`python -I scripts/build-handoff-pdf.py docs <tmp>/handoff.html docs/Blind-deal-team-handoff.pdf`).
- **Repo:** https://github.com/ketutezraugm/blind-deal (private). `main` = releases (tag v0.0.1 = repo setup), `dev` = default. Rules: docs/CONTRIBUTING.md.
- **Artifacts:** style tiles https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ · design system (Abel owns) https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke

## Contracts & TEE
- Owner: Ezra (ketutezraugm). The demo contract is `blind-deal-1wxklib7.testnet` (RPC `https://test.rpc.fastnear.com`), which has the failed-run retry from #106; the old `blind-deal-59xtyh4b.testnet` is retired.
- **Done:** MK-04 client crypto, `Signer`, `nearClient`, `slots.ts` (#48); MK-07 chain half, `scripts/marketplace-roundtrip.mts` (#51); MK-06 wallet login, `walletSigner.ts` + `scripts/wallet-key-check.mts` (#59); mock chain v2, `chainFor`, `mockSigner` (#61); asking-price plan change (#62).
- **In progress:** none. #106 is merged and the demo runs on `blind-deal-1wxklib7.testnet` (verified live: an OutLayer failure was handed back, resubmitted and matched). The TEE secret now lists only the new contract as a reader (old one dropped 2026-11-13, round trip ok after). Still to do: set `CONTRACT_ID` / `VITE_CONTRACT_ID` on Render (Harfi).
- **Next:** P-04 freeze rehearsal (`freeze-check.mts` after the README exists), rerun the round trip right before the freeze.
- **Local full-flow test:** `VITE_RELAYER_URL=http://localhost:8787 npm run dev -w app`, then `npm run dev:relayer` (real relayer app on in-memory fakes, deals from the mock chain, `scripts/dev-relayer.mts`; needs #86 for asking prices). Sign in at `/new` (the name step), not `/signin`. Forgets everything on restart.
- **Still needs a person:** G2 and G3 ticks are the lead's. MK-06's real wallet session passed on Meteor (2026-11-13; see IMPLEMENTATION.md). To repeat it locally: `CONTRACT_ID=blind-deal-1wxklib7.testnet npm run dev:relayer` (needs #115, else the relayer reads the mock chain), the app with `VITE_CONTRACT_ID`, `VITE_RELAYER_URL` and `VITE_TEE_PUBKEY` set, and sign in at `/signin`.
- **Blockers:** Harfi: #107 (relayer key empty, parent account is syuramoon.testnet not shake.testnet), #96 (Supabase Auth settings), #103 (sign-out strands a walletless account), #73 (NEAR_AI_API_KEY on Render), #94 (security findings). Hosted relayer on Render (D1-03, S-06) not started.

## Backend & integration
- Owner: Harfi (SyuraMoons), also the integrator: runs /review-pr on every needs-review PR first. Done: D1-01 scaffold (#11). Integration: merged #11, #9, #12, #7. Done since: migrations 0001 and 0002 (MK-10), D1-02 CI, `POST /accounts` (MK-11), MK-12 profiles, public Q&A, deal chat and inbox endpoints (branch `bi/mk-12-profiles-qa-chat-inbox`). Next: D1-03 Render hello-world, MK-20 Google/email sign-in screens, then MK-14 seed once MK-31 photos land. In progress: docs/DATA-MODEL.md (ERD, rewritten to match the deployed contract); merging the contract stack #13 to #24 and the hardening follow-up #27. Also built a throwaway test UI on mocks (D1-10, branch `fe/d1-10-routes`): landing, name step, sell form, deal page with buyer link; FE and design may rewrite it freely. Done since: MKT-01 marketplace API (listings, photos, slots, claim, sync, "my" views) on the relayer, tests with in-memory fakes (branch `bi/mkt-01-marketplace-api`); not yet run against a live Supabase (the migration is unapplied, MCP not connected). Blockers: Ezra to confirm the marketplace rule; migration to apply.
- **Pivot, Revision B (11-12):** #35 merged as the marketplace base. Next: MK-10 apply 0001 and add 0002 (profiles, questions, messages, `reserved`), D1-02 CI, D1-03 Render; then MK-11 `POST /accounts` with Supabase JWT, MK-12 profiles/Q&A/chat/inbox endpoints and `reserved` sync (add PUT to CORS), MK-20 Google/email sign-in; then MK-14 seed, MK-40 e2e, S-06 hosted. See TEAM.md role 2 and #36.

## Frontend
- Owner: Jose (ChristianoJ21). Done and merged: MK-21 to MK-26, every app screen restyled from Abel's frames (desktop and phone), account menu and footer. In PR: #108 (docs ticks), #109 (singular item count, clear message when a later-round offer is too low). Next: the first live run on testnet (photos, a second buyer losing the slot, wallet user, real assistant), then ask Ezra to tick G3. Blockers: #107 (relayer key and parent account: sign-up returns 503), MK-15 migration 0003 (#98), Supabase Auth settings (#96); root `.env` needs `VITE_TEE_PUBKEY`.

## Design & packaging (Abel)
- Owner: Abel (rafaelaanabelpurba). Done: D1-07 tokens (PR #9); identity switched to direction G (#33); M1-14 stickers and icons (#41); shake motion tokens (#76); Shake logo, favicon and app icons (#46). MK-30/MK-32: 32 marketplace frames (every DESIGN-BRIEF screen at 390 px, desktop at 1280 px, a Should/Could row), asking price public and floor sealed; export in `docs/design/shake-marketplace-screens.html` (#77), canvas https://claude.ai/artifact/7dx4jYjNR6xmLccdQW1dh9 (private until shared), FE notes in #70. MK-31: `seed/` with 6 freely licensed photos, `listings.json` (title, description, category, city, asking price, rounds) and `SOURCES.md`. Design system: https://claude.ai/artifact/C52dyDv46uwPsNeJzL1Rgi. MK-20 screens (sign-in, handle, keys) are merged (#97), waiting on Harfi's Supabase Auth settings (#96). The seller's own-listing panel (answer questions, add offer slots, close) and the global states (404, error with retry, offline, loading, empty, no photo) are built from the frames in #100. The dark footer from the old landing page (slim on phones), the sticker pop-shake for every sticker, the footer's text reveal, wordmark writing and cursor lean, and press and hover feedback on every button are in PR `dp/footer`. Next: demo video and X post (11-14). Open: Ezra to confirm stock photos instead of team photos (DECISIONS 2026-11-13); seed prices are below ARCHITECTURE's 4M/4.6M/5M demo amounts, so MK-14 scales them. Blockers: none.

## Known bugs
- none yet

## Recent decisions
See docs/DECISIONS.md (latest: pivot to a second-hand marketplace, 11-12).

## Tools
- context7 needs auth (`/mcp` in an interactive session). Playwright MCP flaky; playwright-cli skill as fallback.
- Rust: `winget install Rustlang.Rustup`, then `cargo install cargo-near` (near-sdk-js is archived). near-cli-rs: https://docs.near.org/tools/near-cli.

## Usage log
- (paste top consumers from /usage at stage ends)
