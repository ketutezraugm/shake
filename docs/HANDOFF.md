# Handoff

## Key facts
- Deadline: **2026-11-14T23:59Z** (hard). Judging 11-16..18. Started planning 2026-11-09, ~5 days left.
- MODE: TEAM, 4: Ezra (lead), Harfi, Jose, Abel (all design / creative work).
- Idea: not chosen yet. Tracks: TBD.
- Submission: one shot via API or form, only after repo public + X demo post live. No drafts.
- Screening by Claude Code + Codex: README must be reproducible "do X, see Y".

## Compressed schedule (deviates from PLAYBOOK stage sizing because of the deadline)
| Day | Work |
|---|---|
| 11-09 | Phase 0, Phase 1 recon |
| 11-10 | Phase 2 idea, Phase 3 identity, Phase 4 PRD/plan (lean) |
| 11-10..13 | Build; M1 demo slice by end of 11-11 |
| 11-13 | Feature freeze; packaging (video, README, X post) |
| 11-14 | Repo public, X post, submit by ~12:00 UTC |

Playbook deviations: no deck (not required), no submission draft (not possible), fewer subagents.

## Current
- Phase 2 approved 2026-11-10: **Blind deal** (private negotiation, privacy + agents). Spec + trust model at the end of docs/IDEAS.md.
- Phase 3: 3 directions in docs/IDENTITY-DIRECTIONS.md, style tiles at https://claude.ai/artifact/N3gwoQ5biN7HzEoD2ZntvZ . Waiting on direction pick + team skills. TEE spike done (raw/tee-spike.md): OutLayer private-dao-example pattern.
- Roles: split by responsibility in Phase 5; the team assigns names itself.

## Done
- git init, docs/PLAYBOOK.md, ASSUMPTIONS.md, .claude/settings.json (attribution off).
- Gallery dump: docs/research/raw/gallery.json (373 projects, track counts in ASSUMPTIONS.md).
- raw/: track-prompts.md, judges-past-winners.md, sponsor-tech.md, competitor-list.md done.
- raw/competitor-profiles-a.md, -b.md (top 8 deep profiles) done.

## Next
1. Finish RECON.md + COMPETITORS.md from raw/ files.
2. Phase 1 gate.
3. Phase 2 brainstorm.

## Open questions
- Team size field: "2 - 4" or "4 - 6"?
- Multi-track prize stacking: ask organizers.

## Missing tools (install before Stage 2 if wanted)
- context7: needs auth (`/mcp` in an interactive session).
- Playwright MCP: failed to connect; retries automatically. playwright-cli skill works as fallback.
- Remotion skills: `npx skills add remotion-dev/skills` (only if we do a Remotion video).
- VHS (terminal GIFs): `winget install charmbracelet.vhs` (optional).
- near-cli-rs: `npm i -g near-cli-rs` or see https://docs.near.org/tools/near-cli.
- Rust toolchain (`winget install Rustlang.Rustup`, then `cargo install cargo-near`): needed for any contract, because near-sdk-js is archived (raw/sponsor-tech.md). Each dev writing contracts needs it.

## Usage log
- (paste top consumers from /usage at stage end)
