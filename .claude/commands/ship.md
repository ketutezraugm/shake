---
description: Finish the current task and open a PR into dev for the integrator's review
---
1. Confirm I'm on a task branch named `<role>/<task-id>-<name>`, not `dev` or `main`.
2. `git fetch && git merge origin/dev`; resolve conflicts if any.
3. Run the task's done-check from `docs/plans/IMPLEMENTATION.md` and keep its output. If it fails, stop and fix; don't open the PR.
4. Tick the task in `docs/PROGRESS.md`, update my section of `docs/HANDOFF.md`, and add a `docs/DECISIONS.md` entry if behaviour changed. Commit with a Conventional Commit message (human style, no AI trailers).
5. `git push -u origin <branch>`.
6. Open the PR: `gh pr create --base dev --title "<type>: <summary>" --body <filled .github/pull_request_template.md, with the done-check output pasted> --label needs-review`.
7. If the diff touches a shared interface (public methods in `contract/src/lib.rs`, `app/src/contract.ts`, `relayer/src/types.ts`, `app/src/design/tokens.css`), add the `interface-change` label and open an issue for the other side: title `[from:<my role> → to:<their role>] <what changed>`, labels `to:<their role>` + `interface-change`, body linking the PR and saying exactly what they must update.
8. Report the PR URL in one line. Don't merge it: the integrator reviews and merges.
