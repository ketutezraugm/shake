# Contributing: how we work together

Applies to every teammate and every teammate's Claude session. Questions go to the team chat; changes to these rules go through a PR like everything else.

## One-time setup (each person, each machine)
1. Accept the GitHub invite, then `gh auth login`.
2. `git clone https://github.com/ketutezraugm/shake.git` and start Claude Code in the folder.
3. Type **`/onboard`**. It works out your role from your GitHub login, checks your tools, turns on the push guard, explains these rules and shows your first task.

Every session after that: **`/inbox`** to start, **`/ship`** to finish a task, **`/handoff`** before you stop. A session-start hook already tells Claude who you are and what's waiting.

## Branches
| Branch | What it holds | Who writes to it |
|---|---|---|
| `main` | The finished product: what judges, the hosted demo and the submission see | Only via a **release PR** from `dev` |
| `dev` | The integration branch: working, reviewed code (default branch) | Only via **feature PRs** |
| `<role>/<task-id>-<short-name>` | One task in progress, e.g. `ct/m1-02-submit-limit`, `fe/d1-10-skeleton`, `bi/d1-03-render`, `dp/d1-07-tokens`, `lead/docs-git-rules` | The task owner (and their Claude) |

Role prefixes: `ct` Contracts & TEE, `bi` Backend & integration, `fe` Frontend, `dp` Design & packaging, `lead` planning and docs.

## The loop for every task
1. `git checkout dev && git pull` (start from the latest `dev`).
2. `git checkout -b <role>/<task-id>-<short-name>`
3. Work in small commits. Push your branch: `git push -u origin <branch>`.
4. To pick up teammates' work: `git merge dev` into your branch. **Merge, don't rebase**, so nobody ever needs a force push.
5. Run **`/ship`**: it runs the done-check, updates PROGRESS/HANDOFF, pushes, and opens a PR into `dev` labelled `needs-review`.
6. The **integrator** (the Backend & Integration person's Claude, via **`/review-pr <n>`**) merges the PR with the latest `dev` in a scratch worktree, runs every test and the done-check, reviews against these rules, then approves and **squash-merges**, or requests changes with exact failures.
7. If changes are requested, fix them on the same branch and push; the label goes back to `needs-review`.

## Hard rules
- **No force pushes, anywhere.** Not to `main`, not to `dev`, not to your own branch. The push guard blocks them, and Claude sessions are denied the command.
- **No direct pushes to `main` or `dev`.** Every change lands through a PR. Docs and plan edits too.
- **No `--no-verify`.** Skipping hooks to get around the guard is the same as force pushing.
- **One task per PR.** Small PRs get reviewed fast; aim for under ~400 changed lines.
- **Only the integrator merges.** Reviews and merges into `dev` are done by the Backend & Integration person's Claude session (login in `.github/ROLES`). Everyone else's Claude opens PRs and pushes its own task branch; the guard hook blocks `gh pr merge` and `--approve` for them. The owner can also merge.
- **Review someone else's PR before starting new work** if one has waited more than an hour.
- **Shared interfaces need both sides.** A PR that changes contract method signatures (`contract/src/lib.rs` public methods, `app/src/contract.ts`), relayer API types (`relayer/src/types.ts`) or design tokens (`app/src/design/tokens.css`) needs approval from the owner of the other side.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`), human authorship only, no AI trailers or mentions.
- **Secrets never enter git.** `.env` is ignored; add new variables to `.env.example` with a placeholder.

## Releases to `main`
`main` only moves at milestones, through a PR from `dev` titled `release: <milestone>`, merged with a **merge commit** (not squash) and tagged:

| When | PR title | Tag |
|---|---|---|
| M1 demo slice works end to end | `release: M1 demo slice` | `v0.1.0` |
| Feature freeze, 2026-11-14 00:00 UTC | `release: feature freeze` | `v0.9.0` |
| Submission, 2026-11-14 | `release: submission` | `v1.0.0` |

The integrator runs **`/release <milestone>`**; it merges only after Ezra (owner) approves or comments "go" on the release PR. The hosted demo deploys from `main`, so judges always see a released version. Hotfixes after the freeze still go `fix branch → dev → release PR → main`.

## Daily rhythm
- **Daily sync (10 min):** done, next, blocked. Update your section of `docs/HANDOFF.md` and tick `docs/PROGRESS.md` in your PRs.
- **Stuck more than an hour:** post in team chat with what you tried.
- **Decisions:** anything that changes behaviour gets a line in `docs/DECISIONS.md` in the same PR.

## Using Claude in this repo
- Each Claude session works on one task branch. Start it with the resume prompt in `docs/HANDOFF.md`.
- Parallel tasks on one machine: one git worktree per task (`git worktree add ../bd-<task> -b <branch> dev`), never two sessions on the same branch.
- The repo's `.claude/settings.json` runs `.claude/hooks/guard.mjs` before every shell command: it blocks force pushes, pushes to `main`/`dev`, `--no-verify`, changing `core.hooksPath`, and merges or approvals by anyone but the integrator or owner. Don't disable it in `settings.local.json`.

## Owner override
Ezra (`owner` in `.github/ROLES`) can override every rule here, hard rules included:
- **Merging:** the owner can always run `/review-pr` and `/release`.
- **Guards:** prefix a command with `BD_OVERRIDE=1` (e.g. `BD_OVERRIDE=1 git push origin dev`). Both the Claude guard and the git push guard honour it only when `gh api user` returns the owner's login; for anyone else it does nothing.
- **Rules themselves:** the owner edits this file, `.github/ROLES` or the guard in a PR. A decision in chat from Ezra wins over this document until the PR lands.

## AI-to-AI communication
Every teammate works through Claude Code, so the AIs coordinate through GitHub, where every message is durable, linkable and visible to the humans too. Chat is for humans; anything another AI must act on goes into GitHub.

| Need | Channel | How |
|---|---|---|
| Ask or tell another role something | **Issue** | Title `[from:<role> → to:<role>] <ask>`, label `to:ct` / `to:bi` / `to:fe` / `to:dp` / `to:lead`, plus `question`, `blocker` or `interface-change`. Body: context, the exact ask, by when, links to files or PRs. |
| Review feedback | **PR review comments** | The integrator comments with the failing command, output and file:line. The author's AI reads them in `/inbox`. |
| Shared interface changed | **Issue + PR label** | `/ship` adds `interface-change` and opens the issue for the other side automatically. |
| Status for everyone | **`docs/HANDOFF.md`** | Each session updates only its own workstream section, inside its PR. |
| Decisions | **`docs/DECISIONS.md`** | One short entry in the same PR. |

**Session routine for every Claude:**
1. **Start:** run **`/inbox`**. Unblock others first (answer `blocker` issues, address review feedback), then take your next task.
2. **While working:** blocked on another role for more than ~15 minutes? Open a `to:<role>` + `blocker` issue and switch to the next unblocked task rather than waiting.
3. **Finish a task:** **`/ship`**.
4. **End of session:** update your HANDOFF section (it ships with your next PR), and make sure every ask you have of others exists as an issue.
5. **Integrator only:** after `/inbox`, run `/review-pr` on every `needs-review` PR, oldest first, before your own tasks.

**Labels:** `to:ct` `to:bi` `to:fe` `to:dp` `to:lead` · `needs-review` `changes-requested` · `interface-change` `blocker` `question`.
