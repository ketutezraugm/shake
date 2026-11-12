# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Teammate sessions:** first time on a machine, type `/onboard`. Every session after: `/inbox` to start, `/ship` per task, `/handoff` to stop. Role comes from your GitHub login (.github/ROLES); no placeholders.
**Team update (Ezra):** `/handoff team` prints a paste-ready status for the team chat.

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze **2026-11-14 00:00 UTC** (moved by the pivot). Gates G2 11-13 12:00 UTC, G3 11-13 20:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles: Harfi (SyuraMoons) Backend & Integration + integrator; Ezra (ketutezraugm) Contracts & TEE + owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Mapping in .github/ROLES.
- Idea: **Blind deal** (name TBD). **Pivoted 2026-11-12** to a second-hand marketplace: shop link in the seller's bio, listings with photos and an asking price (the seller's floor stays sealed), AI product assistant + public Q&A, blind offers through up to 10 pre-created deals ("slots") per listing on the unchanged contract, escrow, chat after a deal, sign-in with Google/email or a NEAR wallet. Supabase behind the relayer for descriptive data, contract for money. Design: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md; plan: docs/plans/IMPLEMENTATION.md (MK-xx). Tracks: tag every one that fits (no cap); proposal privacy, agents, realworld.
- Submission: one shot, only after repo public + X demo post live. AI screening checks the README reproduces.
- Identity locked: docs/IDENTITY.md (marosok layout, security-tint blue + carbon-copy yellow).

## Lead / planning
- **Status:** 2026-11-12: marketplace pivot planned (Revision B: Harfi's slots on the unchanged contract, Google/email and NEAR wallet sign-in) and written into PRD, ARCHITECTURE, DATA-MODEL, IMPLEMENTATION, PROGRESS, TEAM, TEAM-HANDOFF, BUILD-BRIEF, DESIGN-BRIEF (product parts only), PACKAGING, ENDGAME, DECISIONS (PR from `lead/marketplace-pivot`). Identity and visual design not redone (Abel).
- **Lead duties during the build (Ezra):** `/handoff team` once a day; call gates G2 (slot round trip, 11-13 12:00 UTC) and G3 (11-13 20:00 UTC); approve releases; freeze 11-14 00:00 UTC; submit 11-14 12:00 UTC (checklist: docs/ENDGAME.md Phase 11).
- **Open:** product name (blocks the parent account, README, logo); whether one project can win several tracks (rules silent; ask organizers); claim the $10 NEAR AI key at nearbuilders.org/dashboard (MK-05); competitor re-scan for marketplace entries on 11-13.
- **Before submission:** humanizer pass on README + write-up (docs/PACKAGING.md); regenerate the team PDF only if the team asks (`python -I scripts/build-handoff-pdf.py docs <tmp>/handoff.html docs/Blind-deal-team-handoff.pdf`).
- **Repo:** https://github.com/ketutezraugm/blind-deal (private). `main` = releases (tag v0.0.1 = repo setup), `dev` = default. Rules: docs/CONTRIBUTING.md.
- **Artifacts:** style tiles https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ · design system (Abel owns) https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke

## Contracts & TEE
- Owner: Ezra (ketutezraugm). The contract and TEE are unchanged for the marketplace (Revision B); live demo contract `blind-deal-59xtyh4b.testnet`, RPC `https://test.rpc.fastnear.com`.
- **Done:** MK-04 client crypto, `Signer`, `nearClient`, `slots.ts` (#48); MK-07 chain half, `scripts/marketplace-roundtrip.mts` (#51); MK-06 wallet login, `walletSigner.ts` + `scripts/wallet-key-check.mts` (#59); mock chain v2, `chainFor`, `mockSigner` (#61); asking-price plan change (#62).
- **In progress:** MK-05 is done and in a PR (`ct/mk-05-assistant`): `POST /assistant` (relayer/src/assistant*.ts) passes its live-model checks (`npm test -w relayer -- assistant`, reads `NEAR_AI_API_KEY` from `relayer/.env`). #66 `addSlots` is merged.
- **Next:** once MK-15's `Listing.askingPrice` lands, add it to the assistant prompt. Set `NEAR_AI_API_KEY` on Render after the merge (Harfi owns the service). Then the Supabase half of MK-07 once the migrations are confirmed (#67). Then P-04: `npx tsx scripts/freeze-check.mts` checks the contract and TEE hashes against the chain and the README (rerun after P-01); the test contract `blind-deal-w49onlq9.testnet` was dropped from the secret's `--via` readers by hand on 11-13 (OutLayer's readers can't be read back from chain).
- **Still needs a person:** one real wallet session on testnet (Meteor, Intear or Nightly) to close MK-06: the popup, the key it adds, a payment through the wallet.
- **Blockers:** none. Asks: #67 to Harfi (migrations applied, how to run the relayer on the real Supabase), #68 to Jose (signer helper for wallet users).

## Backend & integration
- Owner: Harfi (SyuraMoons), also the integrator: runs /review-pr on every needs-review PR first. Done: D1-01 scaffold (#11). Integration: merged #11, #9, #12, #7. Done since: migrations 0001 and 0002 (MK-10), D1-02 CI, `POST /accounts` (MK-11), MK-12 profiles, public Q&A, deal chat and inbox endpoints (branch `bi/mk-12-profiles-qa-chat-inbox`). Next: D1-03 Render hello-world, MK-20 Google/email sign-in screens, then MK-14 seed once MK-31 photos land. In progress: docs/DATA-MODEL.md (ERD, rewritten to match the deployed contract); merging the contract stack #13 to #24 and the hardening follow-up #27. Also built a throwaway test UI on mocks (D1-10, branch `fe/d1-10-routes`): landing, name step, sell form, deal page with buyer link; FE and design may rewrite it freely. Done since: MKT-01 marketplace API (listings, photos, slots, claim, sync, "my" views) on the relayer, tests with in-memory fakes (branch `bi/mkt-01-marketplace-api`); not yet run against a live Supabase (the migration is unapplied, MCP not connected). Blockers: Ezra to confirm the marketplace rule; migration to apply.
- **Pivot, Revision B (11-12):** #35 merged as the marketplace base. Next: MK-10 apply 0001 and add 0002 (profiles, questions, messages, `reserved`), D1-02 CI, D1-03 Render; then MK-11 `POST /accounts` with Supabase JWT, MK-12 profiles/Q&A/chat/inbox endpoints and `reserved` sync (add PUT to CORS), MK-20 Google/email sign-in; then MK-14 seed, MK-40 e2e, S-06 hosted. See TEAM.md role 2 and #36.

## Frontend
- Owner: Jose (ChristianoJ21). Done: MK-21 (#50), MK-22 (#60), MK-26 sell form, cards and shop (#69). In progress: MK-23 listing page on `fe/mk-23-listing-page` (listing page, assistant, public Q&A; the offer button is a disabled placeholder until MK-24). Next: MK-24 offer flow (cap the offer at the asking price and say that offering the ask always matches; "Waiting for the seller", "Another buyer got there first"), MK-25 chat and inbox (seller's "Round 2 requested", answering questions); restyle from Abel's MK-32 frames (stand-in design: https://claude.ai/artifact/5JcWiCM3zVvHGjRWKB39QZ). `askingPrice` stays a local type until Harfi's MK-15 lands; #68 (wallet signer in `chainFor`) is Ezra's to extend after MK-20. Blockers: MK-15 for the live price field, MK-05 for the assistant, MK-20 sign-in for live runs.

## Design & packaging (Abel)
- Owner: Abel (rafaelaanabelpurba). Done: D1-07 tokens (PR #9); identity switched to direction G (#33, merged); D1-11 drawn: 12 screens + demo split, phone and desktop, canvas https://claude.ai/artifact/2a84fxGdsY2sezcJvjVAaG page "Final screens (G)" (shared by link; D1-11 tick waits on Jose confirming he can read it); M1-14 stickers and icons (#41, merged); shake motion tokens (sticker pop-shake, deal handshake) on `dp/d1-07-shake-motion`; logo option E "tied together" with favicon and app icons in draft PR #46 (canvas page "Brand: motion and logo"). Design system: https://claude.ai/artifact/C52dyDv46uwPsNeJzL1Rgi. Next (marketplace pivot, #38): marketplace screens in Claude Design, home, listing, profile first, reusing the G blind-offer, reveal, pay and proof frames; MK-31 seed photos (6 real items, team photos). In progress: none. Blockers: product name "Shake" waits on Ezra (#42).

## Known bugs
- none yet

## Recent decisions
See docs/DECISIONS.md (latest: pivot to a second-hand marketplace, 11-12).

## Tools
- context7 needs auth (`/mcp` in an interactive session). Playwright MCP flaky; playwright-cli skill as fallback.
- Rust: `winget install Rustlang.Rustup`, then `cargo install cargo-near` (near-sdk-js is archived). near-cli-rs: https://docs.near.org/tools/near-cli.

## Usage log
- (paste top consumers from /usage at stage ends)
