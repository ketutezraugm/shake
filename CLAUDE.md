# Blind deal (working name)

NEAR HACKATHON 2026 entry. A buyer and a seller each set a private price limit; code in a TEE (OutLayer) compares them; if the ranges overlap, the deal closes at a random price inside the overlap, otherwise both see only "no deal". Up to 3 private rounds, chosen by the seller. The buyer pays into a NEAR escrow contract released on "Received". Testnet only.

**Deadline:** submit by 2026-11-14 12:00 UTC (hard wall 23:59 UTC). Feature freeze 2026-11-13 12:00 UTC.

## Start every session
Run `git checkout dev && git pull`, then create or switch to your task branch. Read `docs/HANDOFF.md`, then your role's section in `docs/TEAM.md` and your next task in `docs/plans/IMPLEMENTATION.md`. Before ending a session, update your own workstream section in `docs/HANDOFF.md` and tick finished tasks in `docs/PROGRESS.md`.

## Doc map
- `docs/ARCHITECTURE.md`: read before touching the contract, enclave code, relayer or their interfaces.
- `docs/DECISIONS.md`: read before changing any behaviour; add an entry when you make a decision.
- `docs/IDENTITY.md`: the visual spec (tokens, type, motion). Read before any UI work.
- `docs/PRD.md`: scope (Must / Should / Could / Won't) and acceptance criteria.
- `docs/IDEAS.md` (end section): user flow, trust model, team feedback on rounds.
- `docs/research/`: rules, judges, competitors. Reach for it only for packaging and pitch work.
- `docs/PLAYBOOK.md`: the team's planning process; not needed for build tasks.

## Hard rules
- **Git: follow `docs/CONTRIBUTING.md`.** Work on a task branch `<role>/<task-id>-<name>` cut from `dev`; open PRs into `dev`; merge `dev` into your branch instead of rebasing. Force pushes, pushes to `main`/`dev`, `--no-verify` and merging PRs are blocked for Claude; a human reviews and merges.
- **Commits and PRs carry only human authorship.** Write conventional commit messages with no Co-Authored-By or "Generated with" lines, and no AI mentions in code comments or the README.
- **Ship only original visuals.** Every icon, illustration and animation comes from Abel's Claude Design exports in `app/src/assets/` with a one-line source note. A missing asset goes back to design. Headless behaviour libraries (Radix, React Aria) are fine; icon, illustration and animation packages are excluded.
- **Implement the design as delivered.** Claude Code builds what the Claude Design files show and invents no visual decisions. Motion uses the IDENTITY.md tokens, animates only `transform` and `opacity`, and respects `prefers-reduced-motion`.
- **Keep secrets in env vars.** Commit `.env.example` only.
- **Outward actions need the whole team:** making the repo public, posting on X, submitting, mainnet anything.
- **Subagents run on Haiku (lookups, extraction) or Sonnet (implementation, synthesis)**, with `model` and `effort` set explicitly. Opus stays the orchestrator.

## Quality bar
- Code reads like one experienced engineer wrote it: small focused modules, consistent names, no speculative abstractions, no dead or commented-out code.
- Comments explain *why*, in one line.
- Strict TypeScript, clippy and lint clean, zero warnings in CI.
- Handle errors at trust boundaries (contract inputs, relayer requests, enclave inputs) and let everything else fail loudly.
- Tests: full TDD for contract money and state transitions and for the enclave's matching and commitment logic; one meaningful check per other non-trivial piece; one end-to-end test of the demo happy path.
- **Done = the task's done-check from IMPLEMENTATION.md, run, with its output shown.**

## Run, test, deploy
Commands live in the root `package.json`, `Cargo.toml` and `render.yaml` once D1-01 lands; read them there. Testnet only. The hosted demo stays up until 2026-11-25.
