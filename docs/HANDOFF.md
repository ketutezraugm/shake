# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Teammate sessions:** first time on a machine, type `/onboard`. Every session after: `/inbox` to start, `/ship` per task, `/handoff` to stop. Role comes from your GitHub login (.github/ROLES); no placeholders.
**Team update (Ezra):** `/handoff team` prints a paste-ready status for the team chat.

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze 2026-11-13 12:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles: Harfi (SyuraMoons) Backend & Integration + integrator; Ezra (ketutezraugm) Contracts & TEE + owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Mapping in .github/ROLES.
- Idea: **Blind deal** (name TBD), private negotiation with TEE matching, private rounds, NEAR escrow. Tracks: privacy + realworld by default; agents instead of realworld only if the AI negotiator ships by the freeze.
- Submission: one shot, only after repo public + X demo post live. AI screening checks the README reproduces.
- Identity locked: docs/IDENTITY.md (marosok layout, security-tint blue + carbon-copy yellow).

## Lead / planning
- **Status:** planning complete (Phases 0-12 approved 2026-11-11). Stage 6 = build, one milestone at a time.
- **Lead duties during the build (Ezra):** `/handoff team` once a day; approve releases ("go" on `/release` PRs); token freeze 11-12 12:00 UTC, feature freeze 11-13 12:00 UTC, submit 11-14 12:00 UTC (checklist: docs/ENDGAME.md Phase 11).
- **Open:** product name (blocks D1-09 parent account, README, logo); whether one project can win multiple tracks (ask organizers); competitor re-scan on 11-13 (not scheduled yet).
- **Before submission:** humanizer pass on README + write-up (docs/PACKAGING.md); regenerate the team PDF only if the team asks (`python -I scripts/build-handoff-pdf.py docs <tmp>/handoff.html docs/Blind-deal-team-handoff.pdf`).
- **Repo:** https://github.com/ketutezraugm/blind-deal (private). `main` = releases (tag v0.0.1 = repo setup), `dev` = default. Rules: docs/CONTRIBUTING.md. Collaborators invited 11-11.
- **Artifacts:** style tiles https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ · design system (Abel owns) https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke

## Contracts & TEE
- Owner: Ezra (ketutezraugm). Next: M1-03..M1-04 contract (TDD), then M1-06 get_pubkey build and deploy. Done: D1-08 spike (answers in DECISIONS.md; testnet account `spike-82nkvzn7.testnet` is throwaway; `outlayer` CLI v0.2.3 is a manual download), D1-04 stub, D1-05 TS types, M1-05 matcher, M1-01 create_deal (vectors in tee/testvectors.json for FE M1-10). In progress: none. Blockers: none.

## Backend & integration
- Owner: Harfi (SyuraMoons), also the integrator: runs /review-pr on every needs-review PR first. Next: D1-02 CI, D1-03 Render hello-world, D1-06, D1-09 relayer. In progress: D1-01 scaffold, in review. Blockers: none.

## Frontend
- Owner: Jose (ChristianoJ21). Next: D1-10 skeleton on mocks (after D1-05, D1-07). In progress: none. Blockers: none.

## Design & packaging (Abel)
- Owner: Abel (rafaelaanabelpurba). Next: D1-07 tokens CSS, D1-11 screens in Claude Design (full brief arrives in Phase 7). In progress: none. Blockers: none.

## Known bugs
- none yet

## Recent decisions
See docs/DECISIONS.md (latest: private rounds replace one attempt, 11-11).

## Tools
- context7 needs auth (`/mcp` in an interactive session). Playwright MCP flaky; playwright-cli skill as fallback.
- Rust: `winget install Rustlang.Rustup`, then `cargo install cargo-near` (near-sdk-js is archived). near-cli-rs: https://docs.near.org/tools/near-cli.

## Usage log
- (paste top consumers from /usage at stage ends)
