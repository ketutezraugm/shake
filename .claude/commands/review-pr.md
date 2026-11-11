---
description: Integrator only - review, integration-test and merge a PR into dev
argument-hint: <pr number>
---
Only for the backend-integration session or the owner (the guard hook blocks merges for everyone else).

PR: $ARGUMENTS

1. Read the PR: `gh pr view $ARGUMENTS --json title,body,author,files,labels,headRefName` and its diff (`gh pr diff $ARGUMENTS`).
2. Integration test on top of the latest dev, in a scratch worktree so my own work is untouched:
   `git fetch origin && git worktree add ../bd-review-$ARGUMENTS origin/<headRefName>`, then in it `git merge origin/dev`.
   Run everything that exists: `cargo test --workspace`, `npm ci`, `npm run typecheck --workspaces`, `npm run lint --workspaces`, `npm run build --workspaces`, `npm test --workspaces`, and the e2e happy path if present. Re-run the done-check pasted in the PR body.
3. Review against `docs/CONTRIBUTING.md` and `CLAUDE.md`: one task, done-check output present and reproducible, tests for money/state/enclave logic, no secrets, no AI attribution, no icon/animation libraries, shared-interface changes have the other side's issue linked, the design matches the Claude Design file for UI work.
4. If anything fails: `gh pr review $ARGUMENTS --request-changes --body "<exact failing command, output excerpt, file:line, what to change>"`, swap the label `needs-review` → `changes-requested`, and stop.
5. If everything passes: `gh pr review $ARGUMENTS --approve --body "<checks run and results>"` (GitHub refuses self-approval; then comment the same text instead), then `gh pr merge $ARGUMENTS --squash --delete-branch`.
6. Clean up: `git worktree remove ../bd-review-$ARGUMENTS`. Update the Integration line of `docs/HANDOFF.md` on my next PR.
7. Report: merged or changes requested, plus the one-line reason.
