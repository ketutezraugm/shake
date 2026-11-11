---
description: Integrator or owner - release dev to main at a milestone
argument-hint: <milestone, e.g. "M1 demo slice" | "feature freeze" | "submission">
---
Milestone: $ARGUMENTS. Tags: M1 demo slice → `v0.1.0`, feature freeze → `v0.9.0`, submission → `v1.0.0`.

1. On latest `origin/dev`, run the full check suite from `/review-pr` step 2 plus the README's "do X, see Y" steps on a clean clone. Stop on any failure.
2. Open the PR: `gh pr create --base main --head dev --title "release: $ARGUMENTS" --body "<changes since last release (git log --oneline origin/main..origin/dev), checks run, known issues>"`.
3. Ask the owner (Ezra) for a "go" in the PR: `gh pr comment <n> --body "@ketutezraugm ready to release $ARGUMENTS; reply go to merge"`. Merge only after the owner approves or comments "go".
4. Merge with a merge commit: `gh pr merge <n> --merge`. Then tag: `git fetch && git tag -a <tag> origin/main -m "$ARGUMENTS" && git push origin <tag>`.
5. Confirm the Render deploy from `main` went live and the hosted demo works; report the URL.
