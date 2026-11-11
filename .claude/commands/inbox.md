---
description: Check what teammates (and their AIs) need from you before starting work
---
Find my role: run `gh api user --jq .login` and match it in `.github/ROLES` (role names map to labels: contracts-tee → `to:ct`, backend-integration → `to:bi`, frontend → `to:fe`, design-packaging → `to:dp`, owner → `to:lead`).

Then gather, in parallel:
1. `git checkout dev && git pull` (stay on my task branch afterwards if I have one, and `git merge dev` into it).
2. Open messages for me: `gh issue list --state open --label to:<role> --json number,title,labels,updatedAt`.
3. Open blockers for anyone: `gh issue list --state open --label blocker --json number,title,labels`.
4. My open PRs and their review state: `gh pr list --author @me --json number,title,reviewDecision,labels,url`; for any with `changes-requested`, read the review comments with `gh pr view <n> --comments`.
5. If my role is backend-integration or owner: PRs waiting for review: `gh pr list --label needs-review --json number,title,author,url`.
6. My section of `docs/HANDOFF.md` and my next unticked task in `docs/PROGRESS.md`.

Report in at most 12 lines: what's blocking someone else (first), review feedback to address, messages to answer, then the next task. Answer questions addressed to me by commenting on the issue (`gh issue comment <n> --body ...`) and close it when done, linking the PR that resolved it.
