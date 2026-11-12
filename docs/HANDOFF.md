# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Teammate sessions:** first time on a machine, type `/onboard`. Every session after: `/inbox` to start, `/ship` per task, `/handoff` to stop. Role comes from your GitHub login (.github/ROLES); no placeholders.
**Team update (Ezra):** `/handoff team` prints a paste-ready status for the team chat.

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze **2026-11-14 00:00 UTC** (moved by the pivot). Gates G2 11-13 12:00 UTC, G3 11-13 20:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles: Harfi (SyuraMoons) Backend & Integration + integrator; Ezra (ketutezraugm) Contracts & TEE + owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Mapping in .github/ROLES.
- Idea: **Blind deal** (name TBD). **Pivoted 2026-11-12** to a second-hand marketplace: shop link in the seller's bio, listings with photos and no price, AI product assistant + public Q&A, blind offers through up to 10 pre-created deals ("slots") per listing on the unchanged contract, escrow, chat after a deal, sign-in with Google/email or a NEAR wallet. Supabase behind the relayer for descriptive data, contract for money. Design: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md; plan: docs/plans/IMPLEMENTATION.md (MK-xx). Tracks: tag every one that fits (no cap); proposal privacy, agents, realworld.
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
- Owner: Ezra (ketutezraugm). Done: D1-04/05/08, M1-01..07, S-05 (#30), secret locked to the WASM build (#31). The contract and TEE stay unchanged for the marketplace (Revision B). Next: **MK-04** client crypto, `Signer`, real contract client and slot helper (unblocks FE, tonight); **MK-07** slot round trip on testnet by G2 (11-13 12:00 UTC); **MK-06** NEAR wallet login; **MK-05** AI assistant (claim the $10 key at nearbuilders.org/dashboard). Live: demo contract `blind-deal-59xtyh4b.testnet`; use `https://test.rpc.fastnear.com`. In progress: none. Blockers: none.

## Backend & integration
- Owner: Harfi (SyuraMoons), also the integrator: runs /review-pr on every needs-review PR first. Done: D1-01 scaffold (#11). Integration: merged #11, #9, #12, #7. Done since: migrations 0001 and 0002 (MK-10), D1-02 CI, `POST /accounts` (MK-11), MK-12 profiles, public Q&A, deal chat and inbox endpoints (branch `bi/mk-12-profiles-qa-chat-inbox`). Next: D1-03 Render hello-world, MK-20 Google/email sign-in screens, then MK-14 seed once MK-31 photos land. In progress: docs/DATA-MODEL.md (ERD, rewritten to match the deployed contract); merging the contract stack #13 to #24 and the hardening follow-up #27. Also built a throwaway test UI on mocks (D1-10, branch `fe/d1-10-routes`): landing, name step, sell form, deal page with buyer link; FE and design may rewrite it freely. Done since: MKT-01 marketplace API (listings, photos, slots, claim, sync, "my" views) on the relayer, tests with in-memory fakes (branch `bi/mkt-01-marketplace-api`); not yet run against a live Supabase (the migration is unapplied, MCP not connected). Blockers: Ezra to confirm the marketplace rule; migration to apply.
- **Pivot, Revision B (11-12):** #35 merged as the marketplace base. Next: MK-10 apply 0001 and add 0002 (profiles, questions, messages, `reserved`), D1-02 CI, D1-03 Render; then MK-11 `POST /accounts` with Supabase JWT, MK-12 profiles/Q&A/chat/inbox endpoints and `reserved` sync (add PUT to CORS), MK-20 Google/email sign-in; then MK-14 seed, MK-40 e2e, S-06 hosted. See TEAM.md role 2 and #36.

## Frontend
- Owner: Jose (ChristianoJ21). Next (marketplace, Revision B): MK-21 home, search and profile against the #35 endpoints; MK-22 create listing (uses `createSlots` from MK-04); MK-23 listing page with assistant and Q&A; MK-24 offer flow (claim a slot, offer, reveal, "Another buyer got there first", pay, received); MK-25 chat and inbox (seller's "Round 2 requested"). Sign-in screens are Harfi's (MK-20); wallet login is Ezra's (MK-06). Done: MK-21 browse (#50, restyle when Abel's MK-30 frames land). In progress: MK-22 on `fe/mk-22-create-listing` (`publishListing` + Sell screen, 3 offer slots at publish; not yet run end to end, needs a deployed relayer and sign-in MK-20). Blockers: `GET /profiles/:handle` returns the shape agreed in #47 (`Shop`).

## Design & packaging (Abel)
- Owner: Abel (rafaelaanabelpurba). Done: D1-07 tokens (PR #9); identity switched to direction G (#32 approved, PR #33); D1-11 drawn: 12 screens + demo split, phone and desktop, canvas https://claude.ai/artifact/2a84fxGdsY2sezcJvjVAaG page "Final screens (G)" (must be shared before others can open it; D1-11 tick waits on Jose confirming he can read it); M1-14 assets in PR #41 (9 stickers, 5 icons, app/src/design/assets/README.md; tick after FE merges). Design system: https://claude.ai/artifact/C52dyDv46uwPsNeJzL1Rgi. Next (marketplace pivot, #38): MK-30 screens in Claude Design, home, listing, profile first, reusing the G blind-offer, reveal, pay and proof frames; MK-31 seed photos (6 real items, team photos) by 11-13 afternoon. In progress: none. Blockers: none (canvas sharing is on Abel).

## Known bugs
- none yet

## Recent decisions
See docs/DECISIONS.md (latest: pivot to a second-hand marketplace, 11-12).

## Tools
- context7 needs auth (`/mcp` in an interactive session). Playwright MCP flaky; playwright-cli skill as fallback.
- Rust: `winget install Rustlang.Rustup`, then `cargo install cargo-near` (near-sdk-js is archived). near-cli-rs: https://docs.near.org/tools/near-cli.

## Usage log
- (paste top consumers from /usage at stage ends)
