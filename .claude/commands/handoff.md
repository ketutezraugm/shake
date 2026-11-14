---
description: End a session cleanly - save work, hand asks to other roles, print a team-chat update and a resume line. Use "/handoff team" for an all-team update.
argument-hint: "[team]"
---
Mode: $ARGUMENTS (empty = my own handoff; `team` = all-team update, meant for Ezra).

**My own handoff (default):**
1. Find my role from `gh api user --jq .login` and `.github/ROLES`.
2. If I'm on a task branch with uncommitted work: commit it (Conventional Commit, `wip:` allowed) and `git push -u origin <branch>`. Never commit to `dev` or `main`.
3. If the task's done-check passes, run `/ship` instead of leaving WIP.
4. Update only my section of `docs/HANDOFF.md`: Next, In progress (task id, branch, file:line where I stopped), Blockers. Commit it on my branch so it ships with the PR.
5. Every ask I have of another role becomes a GitHub issue titled `[from:<me> → to:<them>] <ask>` with label `to:<role>` (+ `blocker` if I'm stuck on it). Check first that it doesn't already exist.
6. Print two blocks for the human:
   - **Team chat** (3-6 lines, plain words, written for teammates): what I finished (PR links), what I'm doing next, what I need from whom (issue links). Address people by first name (Harfi, Ezra, Jose, Abel) without @.
   - **Resume line** for my next session, e.g. `/inbox, then continue M1-02 on ct/m1-02-submit-limit at contract/src/lib.rs:120`.

**Team update (`/handoff team`):**
1. `git fetch`, then gather since the last update (or the last 24 h): PRs merged into `dev` (`gh pr list --state merged --base dev --search "merged:>=<date>"`), open PRs and their review state, open `blocker` issues, every workstream section of `docs/HANDOFF.md`, and `docs/PROGRESS.md` ticks against the day's plan in `docs/plans/IMPLEMENTATION.md`.
2. Compare with the schedule (marketplace plan in docs/plans/IMPLEMENTATION.md, gates G2 2026-11-13 12:00 UTC and G3 20:00 UTC, feature freeze 2026-11-14 00:00 UTC, submission 2026-11-14 12:00 UTC) and name anything at risk.
3. Print one paste-ready message for the team chat, written for the teammates: a status line (on track / at risk), then one line per person (Harfi, Ezra, Jose, Abel): what landed, what's next, what's blocking them, plus the links. End with today's top priority. At most 15 lines.
4. Also print the onboarding block for anyone new: accept the GitHub invite, `gh auth login`, `git clone https://github.com/ketutezraugm/shake`, start Claude Code in the folder, type `/onboard`.
