# Blind deal: team handoff

NEAR HACKATHON 2026 · status on 10 Nov 2026 · prepared by Ezra

## The one-minute version
- **Deadline:** 14 Nov 2026, 23:59 UTC. Our own target: submit by **12:00 UTC on 14 Nov**. Feature freeze is **12:00 UTC on 13 Nov**.
- **What we're building:** *Blind deal* (working name). A buyer and a seller each tell the app their real price limit. A sealed machine (a TEE on NEAR's OutLayer) compares the two. If the ranges overlap, the deal closes at a random price inside the overlap; if not, both see "no deal" and learn nothing else. The buyer pays into an escrow contract on NEAR that releases the money when they confirm they got the item.
- **Why this idea:** out of 373 submissions on 9 Nov, none does negotiation. About half the field builds "spending guards for AI agents", and we're avoiding that crowd. Judges care about security, privacy and not trusting AI with money. Here a fixed rule decides the deal, and the AI only helps people phrase their limits.
- **Tracks:** privacy + realworld by default; agents instead of realworld only if the AI negotiator ships by the freeze.
- **Look:** sarong-check cloth and yellow cattle ear tags, in security-envelope blue. It comes from *marosok*, the West Sumatran cattle-market custom of agreeing a price with fingers hidden under a sarong.

## Roles
| Role | Who | Owns | First task today |
|---|---|---|---|
| Contracts & TEE | Ezra (ketutezraugm) | `contract/`, `tee/` | Install Rust (`winget install Rustlang.Rustup`, then `cargo install cargo-near`), run the OutLayer spike (D1-08) |
| Backend & integration + integrator (reviews and merges PRs) | Harfi (SyuraMoons) | `relayer/`, CI, Render, README | Repo scaffold, CI, Render hello-world, then the relayer (D1-01..03, D1-09) |
| Frontend | Jose (ChristianoJ21) | `app/` | App skeleton on mocks (D1-10) |
| Design & packaging | Abel (rafaelaanabelpurba) | Claude Design, assets, video | Design tokens and the 8 phone screens (D1-07, D1-11) |

## Hard rules for everyone
1. Git: work on task branches, open PRs into `dev` with `/ship`; Harfi's Claude reviews and merges (`/review-pr`); `main` only moves at releases. No force pushes. Details: `docs/CONTRIBUTING.md`.
2. The submission is one-shot: nobody submits, posts on X, or makes the repo public without the whole team agreeing.
3. No AI attribution anywhere: no "Co-Authored-By", no "Generated with" lines in commits, PRs, README or code.
4. No icon, illustration or animation libraries. Every visual comes from Abel's Claude Design files. Motion uses the tokens in the Identity section.
5. No secrets in the repo. Keys go in `.env` files that never get committed.
6. Stuck for more than an hour? Post in the team chat.

## For your Claude
Accept the GitHub invite, clone https://github.com/ketutezraugm/blind-deal, run `git config core.hooksPath .githooks`, start Claude Code in the repo and paste:

> Run /inbox. Then read `docs/HANDOFF.md`, `docs/TEAM.md`, `docs/CONTRIBUTING.md` and `docs/ARCHITECTURE.md`. I own the **[your role]** role. Take my next unticked task in `docs/PROGRESS.md` on its own task branch from `dev`, follow `docs/DECISIONS.md` and `docs/IDENTITY.md`, use Sonnet or Haiku subagents only, and finish with /ship.

Until you have the repo, give your Claude this PDF as context.

## What's in this document
1. This handoff
2. Build brief: every decision, on one page
3. The idea: Blind deal, user flow, trust model
4. PRD: scope, acceptance criteria, risks
5. Architecture: contract, enclave, relayer, deploy
6. Team: roles, interfaces, workflow
7. Collaboration rules: git, integrator, owner override, AI-to-AI communication
8. Implementation plan: 41 tasks with owners and checks
9. Design brief and identity (Abel's starting point)
10. Decisions log
11. Endgame: red-team, win odds, schedule, readiness
12. Research: rules digest, judges, prize map, competitors, assumptions
