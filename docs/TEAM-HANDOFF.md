# Shake: team handoff

NEAR HACKATHON 2026 · status on 10 Nov 2026, updated 12 Nov for the marketplace pivot · prepared by Ezra

## The one-minute version
- **Deadline:** 14 Nov 2026, 23:59 UTC. Our own target: submit by **12:00 UTC on 14 Nov**. Feature freeze is **00:00 UTC on 14 Nov** (moved on 12 Nov by the marketplace pivot).
- **What we're building:** *Shake* (formerly Blind deal), a second-hand marketplace where every listing shows an asking price but the seller's real floor stays sealed. A seller puts their shop link in their Instagram or marketplace bio. Buyers browse listings with photos, ask an AI assistant or the seller about the item, then make a blind offer against the seller's sealed minimum. A sealed machine (a TEE on NEAR's OutLayer) compares the two. If they overlap, the deal closes at a random price inside the overlap; if not, the buyer sees "no deal" and learns nothing else. The buyer pays into an escrow contract on NEAR, chat opens, and the money releases when they confirm they got the item. Since 12 Nov: marketplace data lives in Supabase behind the relayer; money and sealed limits stay on the unchanged contract, with up to 10 pre-created deals per listing. Sign in with Google/email or a NEAR wallet.
- **Why this idea:** out of 373 submissions on 9 Nov, none does negotiation. About half the field builds "spending guards for AI agents", and we're avoiding that crowd. Judges care about security, privacy and not trusting AI with money. Here a fixed rule decides the deal, and the AI only helps people phrase their limits.
- **Tracks:** tag every track that honestly fits (no cap, checked 12 Nov). Proposal: privacy, agents (the AI product assistant), realworld.
- **Look:** sarong-check cloth and yellow cattle ear tags, in security-envelope blue. It comes from *marosok*, the West Sumatran cattle-market custom of agreeing a price with fingers hidden under a sarong.

## Roles
| Role | Who | Owns | Current tasks (12 Nov plan) |
|---|---|---|---|
| Contracts & TEE | Ezra (ketutezraugm) | `contract/`, `tee/`, TS contract client, crypto, slot helper, wallet login, AI assistant | MK-04 client and slot helper, MK-07 slot round trip, MK-06 NEAR wallet login, MK-05 assistant |
| Backend & integration + integrator (reviews and merges PRs) | Harfi (SyuraMoons) | `supabase/`, `relayer/`, sign-in, CI, Render, seed, e2e, README | MK-10 migrations, CI + Render, MK-11 accounts with Supabase login, MK-12 profiles/Q&A/chat/inbox endpoints, MK-20 Google/email sign-in, MK-14 seed, MK-40 e2e |
| Frontend | Jose (ChristianoJ21) | `app/` screens | MK-21 browse and profile, MK-22 create listing, MK-23 listing page, MK-24 offer flow, MK-25 chat and inbox |
| Design & packaging | Abel (rafaelaanabelpurba) | Claude Design, assets, seed photos, video | MK-30 marketplace screens, MK-31 seed photos, video and X post |

## Hard rules for everyone
1. Git: work on task branches, open PRs into `dev` with `/ship`; Harfi's Claude reviews and merges (`/review-pr`); `main` only moves at releases. No force pushes. Details: `docs/CONTRIBUTING.md`.
2. The submission is one-shot: nobody submits, posts on X, or makes the repo public without the whole team agreeing.
3. No AI attribution anywhere: no "Co-Authored-By", no "Generated with" lines in commits, PRs, README or code.
4. No icon, illustration or animation libraries. Every visual comes from Abel's Claude Design files. Motion uses the tokens in the Identity section.
5. No secrets in the repo. Keys go in `.env` files that never get committed.
6. Stuck for more than an hour? Post in the team chat.

## Getting started (5 minutes)
1. Accept the GitHub invite to `ketutezraugm/blind-deal` (check your email or https://github.com/ketutezraugm/blind-deal/invitations).
2. In a terminal: `gh auth login`, then `git clone https://github.com/ketutezraugm/blind-deal.git` and `cd blind-deal`.
3. Start Claude Code in that folder and type **`/onboard`**. That's the whole prompt: Claude works out your role from your GitHub login, checks your tools, turns on the push guard, explains the rules and shows your first task.

**Every session after that**
| When | Type | What happens |
|---|---|---|
| Start | `/inbox` | Messages for you, blockers, review feedback (Harfi: PRs waiting for review) |
| Task done | `/ship` | Runs the task's check, opens a PR into `dev` for Harfi's review |
| Before you stop | `/handoff` | Saves your work, files asks for other roles, prints a team-chat update and a resume line |
| Harfi only | `/review-pr <n>` | Tests a PR on top of `dev` and merges it, or asks for changes |
| Ezra | `/handoff team` | All-team status for the chat |

Until you have the repo, give your Claude this PDF as context.

## What's in this document
1. This handoff
2. Build brief: every decision, on one page
3. The idea: Shake, user flow, trust model
4. PRD: scope, acceptance criteria, risks
5. Architecture: contract, enclave, relayer, deploy
6. Team: roles, interfaces, workflow
7. Collaboration rules: git, integrator, owner override, AI-to-AI communication
8. Implementation plan: marketplace tasks (MK-xx) with owners and checks
9. Design brief and identity (Abel's starting point)
10. Decisions log
11. Endgame: red-team, win odds, schedule, readiness
12. Research: rules digest, judges, prize map, competitors, assumptions
