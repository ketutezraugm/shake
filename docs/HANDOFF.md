# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Teammate sessions:** first time on a machine, type `/onboard`. Every session after: `/inbox` to start, `/ship` per task, `/handoff` to stop. Role comes from your GitHub login (.github/ROLES); no placeholders.
**Team update (Ezra):** `/handoff team` prints a paste-ready status for the team chat.

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze **2026-11-14 00:00 UTC** (moved by the pivot). Gates G2 11-13 12:00 UTC, G3 11-13 20:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles: Harfi (SyuraMoons) Backend & Integration + integrator; Ezra (ketutezraugm) Contracts & TEE + owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Mapping in .github/ROLES.
- Idea: **Blind deal** (name TBD). **Pivoted 2026-11-12** to a second-hand marketplace: shop link in the seller's bio, listings with photos and no price, AI product assistant + public Q&A, blind offers against a sealed per-listing minimum (TEE matching), escrow, chat after a deal. Supabase for descriptive data, contract for money. Design: docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md; plan: docs/plans/IMPLEMENTATION.md (MK-xx). Tracks: tag every one that fits (no cap); proposal privacy, agents, realworld.
- Submission: one shot, only after repo public + X demo post live. AI screening checks the README reproduces.
- Identity locked: docs/IDENTITY.md (marosok layout, security-tint blue + carbon-copy yellow).

## Lead / planning
- **Status:** 2026-11-12: marketplace pivot planned and written into PRD, ARCHITECTURE, DATA-MODEL, IMPLEMENTATION, PROGRESS, TEAM, TEAM-HANDOFF, BUILD-BRIEF, DESIGN-BRIEF (product parts only), PACKAGING, ENDGAME, DECISIONS (PR from `lead/marketplace-pivot`). Identity and visual design not redone (Abel).
- **Lead duties during the build (Ezra):** `/handoff team` once a day; call gates G2 (11-13 12:00 UTC) and G3 (11-13 20:00 UTC); approve releases; freeze 11-14 00:00 UTC; submit 11-14 12:00 UTC (checklist: docs/ENDGAME.md Phase 11).
- **Open:** product name (blocks the parent account, README, logo); whether one project can win several tracks (rules silent; ask organizers); claim the $10 NEAR AI key at nearbuilders.org/dashboard (MK-05); competitor re-scan for marketplace entries on 11-13.
- **Before submission:** humanizer pass on README + write-up (docs/PACKAGING.md); regenerate the team PDF only if the team asks (`python -I scripts/build-handoff-pdf.py docs <tmp>/handoff.html docs/Blind-deal-team-handoff.pdf`).
- **Repo:** https://github.com/ketutezraugm/blind-deal (private). `main` = releases (tag v0.0.1 = repo setup), `dev` = default. Rules: docs/CONTRIBUTING.md.
- **Artifacts:** style tiles https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ · design system (Abel owns) https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke

## Contracts & TEE
- Owner: Ezra (ketutezraugm). The secret is locked to the WASM build (DECISIONS.md says how to move the lock on a redeploy). Next: at the freeze drop the test contract from the secret's `--via` readers; S-01 `attest` action once M1-11 is in; P-04 freeze checks. Live: demo contract `blind-deal-59xtyh4b.testnet`, TEE pubkey and project in DECISIONS.md (M1-06, S-05). Use `https://test.rpc.fastnear.com`, not the legacy RPC, and mind the faucet rate limit (S-05). Done: D1-08, D1-04, D1-05, M1-01..M1-07, S-05. In progress: none. Blockers: none.

## Backend & integration
- Owner: Harfi (SyuraMoons), also the integrator: runs /review-pr on every needs-review PR first. Done: D1-01 scaffold (#11). Integration: merged #11, #9, #12, #7. Next: apply `supabase/migrations/0001_marketplace.sql` to the Supabase project, D1-02 CI, D1-03 Render hello-world, D1-09 `POST /accounts`. In progress: docs/DATA-MODEL.md (ERD, rewritten to match the deployed contract); merging the contract stack #13 to #24 and the hardening follow-up #27. Also built a throwaway test UI on mocks (D1-10, branch `fe/d1-10-routes`): landing, name step, sell form, deal page with buyer link; FE and design may rewrite it freely. Done since: MKT-01 marketplace API (listings, photos, slots, claim, sync, "my" views) on the relayer, tests with in-memory fakes (branch `bi/mkt-01-marketplace-api`); not yet run against a live Supabase (the migration is unapplied, MCP not connected). Blockers: Ezra to confirm the marketplace rule; migration to apply.

## Frontend
- Owner: Jose (ChristianoJ21). Next: D1-10 skeleton on mocks (after D1-05, D1-07). In progress: none. Blockers: none.
- **Pivot 2026-11-12:** your plan is now MK-21 browse/profile, MK-22 create listing, MK-23 listing page (assistant, Q&A), MK-24 offer flow, MK-25 chat and inbox. Sign-in moved to Harfi; the real contract client to Ezra. See TEAM.md role 3.

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
