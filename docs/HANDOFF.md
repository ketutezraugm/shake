# Handoff

**Resume prompt (lead / planning session):** `Read docs/HANDOFF.md, then continue the next step under "Lead / planning" of docs/PLAYBOOK.md.`
**Resume prompt (a teammate's build session):** `Read docs/HANDOFF.md, docs/TEAM.md and docs/ARCHITECTURE.md. I own the [role] role. Continue my next unticked task in docs/PROGRESS.md.`

Each session edits only its own workstream section below.

## Key facts
- Deadline: submit by **2026-11-14 12:00 UTC** (hard wall 23:59 UTC). Feature freeze 2026-11-13 12:00 UTC. Judging 11-16..18.
- Team of 4 (submission size `"2 - 4"`): Ezra (lead), Harfi, Jose, Abel (all design and creative work). Roles in TEAM.md; names not assigned yet.
- Idea: **Blind deal** (name TBD), private negotiation with TEE matching, private rounds, NEAR escrow. Tracks: privacy + realworld by default; agents instead of realworld only if the AI negotiator ships by the freeze.
- Submission: one shot, only after repo public + X demo post live. AI screening checks the README reproduces.
- Identity locked: docs/IDENTITY.md (marosok layout, security-tint blue + carbon-copy yellow).

## Lead / planning
- **Done:** Phases 0-6. Recon, competitors, idea (2 rounds), identity, PRD, architecture, team, plan, decisions, CLAUDE.md, PROGRESS.md. Team feedback on rounds applied 11-11.
- **Next:**
  1. Phase 7 gate (Ezra). Abel builds screens in her own Claude Design canvas from DESIGN-BRIEF.md + the design system.
  2. Phase 8: quality bar is already in CLAUDE.md; confirm at the gate.
  3. Phases 9-12: red-team, win assessment, endgame, readiness check.
  4. After all planning phases: regenerate the team PDF with `python -I scripts/build-handoff-pdf.py docs <tmp>/handoff.html docs/Blind-deal-team-handoff.pdf`. Not before.
- **Endgame:** docs/ENDGAME.md (red-team, win odds, endgame, readiness). Token freeze 11-12 12:00 UTC.
- **Open:** product name (blocking: needed today); whether one project can win multiple tracks (ask organizers).
- **Repo:** https://github.com/ketutezraugm/blind-deal (private, branch main). Add teammates as collaborators.
- **Artifacts:** style tiles https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ · design system (starting point, Abel owns) https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke
- **Phase 7 drafts:** docs/DESIGN-BRIEF.md (fixed vs Abel's call), docs/PACKAGING.md (video, X post, write-up, pitch, Q&A, demo plan, real-user plan; humanizer pass once the product exists).

## Contracts & TEE
- Owner: _unassigned_. Next: D1-04 contract stub, D1-08 OutLayer spike (2-3 h). In progress: none. Blockers: none.

## Backend & integration
- Owner: _unassigned_. Next: D1-01 scaffold, D1-02 CI, D1-03 Render hello-world, D1-06, D1-09 relayer. In progress: none. Blockers: none.

## Frontend
- Owner: _unassigned_. Next: D1-10 skeleton on mocks (after D1-05, D1-07). In progress: none. Blockers: none.

## Design & packaging (Abel)
- Next: D1-07 tokens CSS, D1-11 screens in Claude Design (full brief arrives in Phase 7). In progress: none. Blockers: none.

## Known bugs
- none yet

## Recent decisions
See docs/DECISIONS.md (latest: private rounds replace one attempt, 11-11).

## Tools
- context7 needs auth (`/mcp` in an interactive session). Playwright MCP flaky; playwright-cli skill as fallback.
- Rust: `winget install Rustlang.Rustup`, then `cargo install cargo-near` (near-sdk-js is archived). near-cli-rs: https://docs.near.org/tools/near-cli.

## Usage log
- (paste top consumers from /usage at stage ends)
