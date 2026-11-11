# Contributing: how we work together

Applies to every teammate and every teammate's Claude session. Questions go to the team chat; changes to these rules go through a PR like everything else.

## One-time setup (each person, each clone)
```sh
git clone https://github.com/ketutezraugm/blind-deal.git
cd blind-deal
git config core.hooksPath .githooks   # turns on the push guard
git checkout dev
```

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
5. Open a PR into `dev`: `gh pr create --base dev --fill`. Fill in the template (what, task id, the done-check output).
6. One teammate reviews and approves. CI must be green.
7. The **author merges** with **Squash and merge**, then deletes the branch.

## Hard rules
- **No force pushes, anywhere.** Not to `main`, not to `dev`, not to your own branch. The push guard blocks them, and Claude sessions are denied the command.
- **No direct pushes to `main` or `dev`.** Every change lands through a PR. Docs and plan edits too.
- **No `--no-verify`.** Skipping hooks to get around the guard is the same as force pushing.
- **One task per PR.** Small PRs get reviewed fast; aim for under ~400 changed lines.
- **A human merges.** Claude can open PRs and push to its own task branch. It never approves or merges a PR, and it never merges `dev` into `main`.
- **Review someone else's PR before starting new work** if one has waited more than an hour.
- **Shared interfaces need both sides.** A PR that changes contract method signatures (`contract/src/lib.rs` public methods, `app/src/contract.ts`), relayer API types (`relayer/src/types.ts`) or design tokens (`app/src/design/tokens.css`) needs approval from the owner of the other side.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`), human authorship only, no AI trailers or mentions.
- **Secrets never enter git.** `.env` is ignored; add new variables to `.env.example` with a placeholder.

## Releases to `main`
`main` only moves at milestones, through a PR from `dev` titled `release: <milestone>`, merged with a **merge commit** (not squash) and tagged:

| When | PR title | Tag |
|---|---|---|
| M1 demo slice works end to end | `release: M1 demo slice` | `v0.1.0` |
| Feature freeze, 2026-11-13 12:00 UTC | `release: feature freeze` | `v0.9.0` |
| Submission, 2026-11-14 | `release: submission` | `v1.0.0` |

The release PR needs approval from **two** teammates, one of them Ezra. The hosted demo deploys from `main`, so judges always see a released version. Hotfixes after the freeze still go `fix branch → dev → release PR → main`.

## Daily rhythm
- **Daily sync (10 min):** done, next, blocked. Update your section of `docs/HANDOFF.md` and tick `docs/PROGRESS.md` in your PRs.
- **Stuck more than an hour:** post in team chat with what you tried.
- **Decisions:** anything that changes behaviour gets a line in `docs/DECISIONS.md` in the same PR.

## Using Claude in this repo
- Each Claude session works on one task branch. Start it with the resume prompt in `docs/HANDOFF.md`.
- Parallel tasks on one machine: one git worktree per task (`git worktree add ../bd-<task> -b <branch> dev`), never two sessions on the same branch.
- The repo's `.claude/settings.json` denies force pushes, pushes to `main` and `dev`, `--no-verify`, and merging PRs. Don't override it in `settings.local.json`.
