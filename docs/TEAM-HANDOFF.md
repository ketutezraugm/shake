# Blind deal: team handoff

NEAR HACKATHON 2026 · status on 10 Nov 2026 · prepared by Ezra

## The one-minute version
- **Deadline:** 14 Nov 2026, 23:59 UTC. Our own target: submit by **12:00 UTC on 14 Nov**. Feature freeze is **12:00 UTC on 13 Nov**.
- **What we're building:** *Blind deal* (working name). A buyer and a seller each tell the app their real price limit. A sealed machine (a TEE on NEAR's OutLayer) compares the two. If the ranges overlap, the deal closes at a random price inside the overlap; if not, both see "no deal" and learn nothing else. The buyer pays into an escrow contract on NEAR that releases the money when they confirm they got the item.
- **Why this idea:** out of 373 submissions on 9 Nov, none does negotiation. About half the field builds "spending guards for AI agents", and we're avoiding that crowd. Judges care about security, privacy and not trusting AI with money. Here a fixed rule decides the deal, and the AI only helps people phrase their limits.
- **Tracks:** privacy, plus agents if the AI negotiator ships (realworld otherwise).
- **Look:** sarong-check cloth and yellow cattle ear tags, in security-envelope blue. It comes from *marosok*, the West Sumatran cattle-market custom of agreeing a price with fingers hidden under a sarong.

## Roles (the team assigns names)
| Role | Owns | First task today |
|---|---|---|
| Contracts & TEE | `contract/`, `tee/` | Install Rust (`winget install Rustlang.Rustup`, then `cargo install cargo-near`), run the OutLayer spike (D1-08) |
| Backend & integration | `relayer/`, CI, Render, README | Repo scaffold, CI, Render hello-world, then the relayer (D1-01..03, D1-09) |
| Frontend | `app/` | App skeleton on mocks (D1-10) |
| Design & packaging (Abel) | Claude Design, assets, video | Design tokens and the 8 phone screens (D1-07, D1-11) |

## Hard rules for everyone
1. The submission is one-shot: nobody submits, posts on X, or makes the repo public without the whole team agreeing.
2. No AI attribution anywhere: no "Co-Authored-By", no "Generated with" lines in commits, PRs, README or code.
3. No icon, illustration or animation libraries. Every visual comes from Abel's Claude Design files. Motion uses the tokens in the Identity section.
4. No secrets in the repo. Keys go in `.env` files that never get committed.
5. Stuck for more than an hour? Post in the team chat.

## For your Claude
Once you have the repo, start your Claude Code session in it and paste:

> Read `docs/HANDOFF.md`, `docs/TEAM.md` and `docs/ARCHITECTURE.md`. I own the **[your role]** role. Work through my tasks in `docs/plans/IMPLEMENTATION.md` in order, starting at the first one not marked done. Follow `docs/DECISIONS.md` and `docs/IDENTITY.md` exactly. Use Sonnet or Haiku subagents only, never Opus. Never add AI attribution to commits or PRs. Run each task's done-check and show me the output before calling it done.

Until you have the repo, give your Claude this PDF as context.

## What's in this document
1. This handoff
2. Build brief: every decision, on one page
3. The idea: Blind deal, user flow, trust model
4. PRD: scope, acceptance criteria, risks
5. Architecture: contract, enclave, relayer, deploy
6. Team: roles, interfaces, workflow
7. Implementation plan: 41 tasks with owners and checks
8. Identity: colors, type, motion (Abel's spec)
9. Decisions log
10. Research: rules digest, judges, prize map, competitors, assumptions
