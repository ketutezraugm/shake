# Decisions

Short ADRs, newest last.

## 2026-11-09 Avoid the agent-guard cluster
Security/agents hold half the field (~72 guard-style names). Pick under-contested spaces. (COMPETITORS.md)

## 2026-11-10 Idea: Blind deal (private negotiation)
Round 1 (sticker/GPS game) parked by Ezra as off-track for winning. Blind deal: zero negotiation entries among 373; money-native; AI kept out of the money path. (IDEAS.md)

## 2026-11-10 Price rule: random price inside the overlap
Midpoint leaks the counterparty's limit. A uniform random price in [seller_min, buyer_max] leaks only a bound. Randomness comes from the TEE (OutLayer WASM), not `env::random_seed`, which validators can see.

## 2026-11-10 TEE: OutLayer WASM, not NEAR AI Cloud
NEAR AI Cloud can't run custom code. OutLayer runs our WASM in TDX, called from the contract (private-dao-example pattern). Fallbacks: matching service with a registered key (trust stated), then commit-reveal. (raw/tee-spike.md)

## 2026-11-10 Identity: B layout + A colors
Abel's pick: marosok sarong/ear-tag structure, security-tint blue + carbon-copy yellow. (IDENTITY.md)

## 2026-11-10 Result trust
Must: OutLayer callback path + stated centralisation. Should: enclave-signed results verified in the contract.

## 2026-11-10 Units: Rupiah in, testnet NEAR in escrow at a fixed demo rate
Users think in Rupiah. Fixed `rp_per_near` set at init (default 100,000,000, lowered 11-11 so escrow needs little testnet NEAR); no oracle.

## 2026-11-10 Binding deals without a bond
A matched buyer who never pays can't be forced; `expire` frees the deal after 24 h. A buyer bond would leak information if sized to the limit; a fixed bond is a Could.

## 2026-11-10 NEAR AI Cloud key stays server-side
The relayer proxies NEAR AI requests and adds the API key; prompts are E2EE from the browser to the model's attested key, so the relayer can't read them (verify in spike).

## 2026-11-10 App account
`kodejari.testnet` is free (checked via RPC 2026-11-10) but the name isn't chosen; create the parent account once the name is final. Sub-accounts: `<name>.<parent>.testnet`.

## 2026-11-10 No database
The contract is the source of truth; no Supabase.

## 2026-11-12 Scaffold pins and toolchain notes
JS dependencies are pinned exactly in `package.json` (near-api-js 7.4.0 as decided). TypeScript is 6.0.3, not 7.x, because typescript-eslint 8.72.2 only supports `<6.1.0`; revisit when it does. `contract` takes near-sdk with the `unit-testing` feature as a dev-dependency, since near-sdk refuses a plain host build; as a result `cargo test -p contract` works on the host but `cargo check -p contract` does not, so D1-04's done-check needs `--target wasm32-unknown-unknown` (Ezra's call). `cargo update` was needed once on a stale local registry index; `Cargo.lock` is committed.

## 2026-11-12 Contract stub (D1-04): interface notes
Stub follows ARCHITECTURE.md (so `create_deal` takes `max_rounds`; the plan's D1-04 line predates private rounds). Done-check is `cargo check -p contract --target wasm32-unknown-unknown`, with clippy `-D warnings` and `cargo fmt --check` clean; a host check is impossible on Windows because near-sdk's unit-testing dependencies need NASM (aws-lc-sys). JSON shapes the frontend must match: `link_hash`, `commit` and the `Deal` commit lists are `[u8;32]`, so they arrive and leave as arrays of 32 numbers, and `ct` is a `Vec<u8>` number array; `price` is a `U128` string in yoctoNEAR; `State` serializes as its variant name; `get_deal`/`get_state` return `null` for an unknown id. `rp_per_near` is a fixed constant set in `new` (no parameter, no setter).

## 2026-11-11 Private rounds replace "one attempt"
Team feedback: one attempt punishes misjudgment. Seller chooses 1-3 rounds per buyer (default 2); concessions are monotonic (buyer up, seller down), enforced in the TEE; each round leaks at most 1 bit; a deal ends the game. Laddering accepted as private haggling. "Close" hint dropped (leaks more). Contract: `max_rounds`, `round`, per-round ciphertexts, `Retry` state. (IDEAS.md, feedback section)

## 2026-11-11 Red-team fixes (ENDGAME.md)
Default tracks privacy + realworld (agents only if S-02 ships). README and `.env.example` default to the hosted relayer and deployed contract so a clean clone runs without secrets. Token freeze 11-12 12:00 UTC. Cut: Bahasa toggle, receipt page (explorer links instead). Sustainability story: 0.5% fee on settled deals; marketplaces embed the link.

## 2026-11-11 Git workflow: main + dev, PR-only, no force pushes
`main` holds releases only (release PRs from `dev`, merge commit, tagged v0.1.0 / v0.9.0 / v1.0.0, two approvals incl. Ezra). `dev` is the default integration branch; task branches `<role>/<task-id>-<name>`; squash-merge by the author after 1 review + green CI; merge `dev` into branches instead of rebasing so no force push is ever needed. Enforced by `.githooks/pre-push` (blocks main/dev pushes and non-fast-forward pushes) and `.claude/settings.json` deny rules (force push, main/dev push, --no-verify, PR merge/approve). Server-side branch protection needs GitHub Pro on a private repo (open question). (docs/CONTRIBUTING.md)

## 2026-11-11 AI integrator, owner override, AI-to-AI channel
Ezra: reviews and merges are done by AI, gated to the Backend & Integration person's session; Ezra can override any rule. Static deny rules replaced by `.claude/hooks/guard.mjs` (checks `gh api user` against `.github/ROLES`; `BD_OVERRIDE=1` works only for the owner). AIs coordinate through GitHub issues labelled `to:<role>`, PR reviews and HANDOFF sections; shared commands `/inbox`, `/ship`, `/review-pr`, `/release` in `.claude/commands/`. Supersedes "a human merges" in the entry above.

## 2026-11-11 Roles assigned
Harfi (SyuraMoons) Backend & Integration and integrator; Ezra (ketutezraugm) Contracts & TEE and owner; Jose (ChristianoJ21) Frontend; Abel (rafaelaanabelpurba) Design & packaging. Ezra's own PRs still go through Harfi's /review-pr like everyone's. Collaborators invited with write access; CODEOWNERS routes review requests.

## 2026-11-11 One-word onboarding and handoffs
`/onboard` (first time per machine, role from GitHub login, tools, push guard, rules, first task), `/handoff` (end of session; `/handoff team` for Ezra's all-team update) and a SessionStart hook that reports the user's role and waiting work. The guard now allows `core.hooksPath .githooks` so `/onboard` can enable the push guard; any other value stays blocked.

## 2026-11-11 Planning complete
Phases 0-12 approved by Ezra. Build starts (Stage 6). Planning docs change from here only when the build proves them wrong, via PR with a DECISIONS entry.

## 2026-11-12 OutLayer spike (D1-08): works on testnet
Verified on testnet: `eciesjs` ciphertext decrypts inside an OutLayer execution, with the key derived by HKDF-SHA256 (`info = "blind-deal:ecies"`) from a TEE-generated `PROTECTED_DEAL_MASTER_SECRET` (hex32). `node scripts/spike-ecies.mjs` prints `decrypted: {"limit":"4000000"}` (two executions, about 28 s end to end).
- **Workers:** testnet workers are live; both executions completed on the first try.
- **Fee:** attach 0.0020001 NEAR with 300 TGas; the charge was about 0.00107 NEAR and the rest was refunded. `estimate_execution_cost` view returned 0.0070001 NEAR for default limits (an upper bound).
- **`request_execution` args (real names):** `source: {Project: {project_id, version_key: null}}`, `input_data` (JSON string, stdin of the WASM), `resource_limits: {max_instructions, max_memory_mb, max_execution_seconds}`, `secrets_ref: {profile, account_id}`, `response_format: "Json"`, `params: null`, `payer_account_id: null`.
- **Result shape:** the WASM's stdout parsed as JSON, here `{"success":true,"result":{...}}`; the caller's promise result is that JSON as a `SuccessValue`. The contract callback must read it with `env::promise_result(0)` and expect this envelope, so the match result is `{"success":true,"result":{"deal_id","matched","price"}}`.
- **Build and deploy:** `cargo build --target wasm32-wasip2 --release`, then `outlayer upload` (FastFS, prints the sha256), `outlayer deploy <name> <url>`, `outlayer secrets set --project <acct/name> --profile production --generate PROTECTED_DEAL_MASTER_SECRET:hex32`. The secret is read by Project runs only.
- **Gotchas:** (1) the `ecies` crate's `pure` feature needs the `critical-section` crate with feature `std`, or the link leaves a `critical_section_1_0_acquire` import that the host linker rejects and OutLayer would not satisfy. (2) `eciesjs` 0.5 returns a `Uint8Array`; hex-encode with `Buffer.from(x).toString("hex")`. (3) `near-cli-rs` does not build on Windows (openssl-sys); use `near-api-js` for scripts and the faucet at `helper.nearprotocol.com/account` for accounts. (4) Spike account `spike-82nkvzn7.testnet` is throwaway; its key stays out of the repo.
- **Still open:** can a `PROTECTED_` ed25519 secret sign results (S-07)? Not tested here. The spike WASM's `decrypt` action echoes plaintext and must not ship; `run_match` returns only `{deal_id, matched, price}`.
