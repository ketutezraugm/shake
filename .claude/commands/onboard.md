---
description: First-time setup for a teammate on this machine - identity, tools, push guard, rules, first task
---
Set this teammate up so their first task can start right after. Talk to them in plain words; they may be new to parts of this.

1. **Who:** `gh auth status` (not logged in → ask them to run `gh auth login` and stop). `gh api user --jq .login`, then find their role(s) in `.github/ROLES`. Not listed → tell them to ask Ezra and stop. Map roles to task owners in `docs/plans/IMPLEMENTATION.md`: contracts-tee = CT, backend-integration = BI, frontend = FE, design-packaging = DP.
2. **Repo:** `git config core.hooksPath .githooks`, then `git checkout dev && git pull`. Confirm the GitHub invite is accepted (`gh api repos/ketutezraugm/blind-deal --jq .permissions.push` prints `true`); if not, send them to https://github.com/ketutezraugm/blind-deal/invitations.
3. **Tools,** checked with version commands, missing ones listed with the install command for their OS (Windows: winget; macOS: brew):
   - everyone: `git`, `gh`, `node` 20+ (`npm`)
   - CT: `rustup`/`cargo` (`winget install Rustlang.Rustup`), `cargo near` (`cargo install cargo-near`), `near` CLI (https://docs.near.org/tools/near-cli)
   - BI: everything above for running the full test suite as integrator, plus a Render account
   - FE: a recent Chrome or Edge for testing
   - DP: access to Claude Design and the design system https://claude.ai/artifact/MZUADs1rMt3bbtCbXChzke (ask Ezra to share it if it won't open)
4. **Rules, in five lines,** from `docs/CONTRIBUTING.md`: task branches from `dev` named `<role>/<task-id>-<name>`; finish with `/ship`; only the integrator (Harfi) merges, via `/review-pr`; no force pushes or pushes to `main`/`dev` (the guard blocks them); talk to other roles through GitHub issues labelled `to:<role>`, and start each session with `/inbox`.
5. **Their work:** their section of `docs/HANDOFF.md`, and their first three unticked tasks in `docs/PROGRESS.md` with owners and dependencies from `docs/plans/IMPLEMENTATION.md`. Mark which can start now and which wait on someone.
6. **Inbox:** do what `/inbox` does (messages, blockers, PRs to review if integrator).
7. **Report** in at most 15 lines: who they are and their role, setup status (missing tools with install commands), the five rules, then the first task with its exact branch name. Ask: "Start <task id> now?"
