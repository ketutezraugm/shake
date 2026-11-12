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

## 2026-11-12 Matcher and commitment (M1-05)
The `match` request now also carries `seller_commits` and `buyer_commits` (hex, from the contract's storage): without them the TEE cannot check a ciphertext against what was committed on-chain. Commitment is `sha256("blind-deal:v1|{deal_id}|{side}|{round}|{limit}|{salt}")`, so it is bound to deal, side and round and cannot be replayed. Rules in `tee/src/lib.rs`: every round is opened and checked (deal, side, round slot, commitment); exactly one ciphertext and commitment per round, `round >= 1`; limits are canonical decimal u64, nonzero. Anything wrong is `Invalid` (the WASM's `{"deal_id":N,"error":"invalid"}` inside `success:true`; the contract callback treats it like a malformed result: no-deal for that round). A monotonic-concession violation is a plain no-deal, not invalid. Price is uniform in `[seller_min, buyer_max]` via `rand` 0.9; whether its getrandom backend works on OutLayer's wasip2 runtime is unverified until M1-06 runs the matcher there. `tee/testvectors.json` holds a seller and a buyer vector made with eciesjs 0.5.0 (test-only key `22..22`), checked by `tee/tests/vectors.rs`; the frontend's `crypto.test.ts` (M1-10) must reproduce the same commits.

## 2026-11-12 Contract host tests on Windows (M1-01)
`cargo test -p contract` builds near-sdk's unit-testing dependencies, and `aws-lc-sys` wants NASM on Windows. Setting `AWS_LC_SYS_PREBUILT_NASM=1` uses its prebuilt objects instead, so no NASM install is needed (`export AWS_LC_SYS_PREBUILT_NASM=1` in bash, `$env:AWS_LC_SYS_PREBUILT_NASM=1` in PowerShell). Limits: title 1-100 bytes, description at most 1000 bytes; deal ids start at 0.

## 2026-11-12 submit_limit, rounds and cancel (M1-02)
`new` takes a third argument, `project_id` (OutLayer `owner/name`): the contract must name the project to run, and the secret is read from the owner's account under profile `production`. The call that completes a round attaches the OutLayer fee and the contract forwards all of it to `request_execution` with the caller as `payer_account_id`, so the unused fee is refunded to whoever paid; any other call must attach nothing. Gas is 200 TGas for the OutLayer call and 20 TGas for the callback, both guesses to tune at M1-07. A failed OutLayer call does not undo the submit (the promise is dropped, not returned). `cancel` ends a deal as `NoDeal` (no separate Cancelled state) and works only for the seller in Created or Waiting. `on_outlayer_result` handles only the no-deal paths so far (Retry while rounds remain, else NoDeal); M1-03 adds the matched path and `cancel_blocked_once_matched`.

## 2026-11-12 Callback and matched price (M1-03)
`on_outlayer_result` reads the OutLayer result with a 1 KiB cap and accepts a match only for `{"success":true,"result":{"deal_id":<this deal>,"matched":true,"price":"<canonical Rupiah>"}}`; a failed execution, bad JSON, `success:false`, `{"error":"invalid"}`, another deal's id, a zero, signed, non-numeric or u64-overflowing price all count as a no-deal for the round (Retry while rounds remain, else NoDeal). The price is stored in yoctoNEAR as Rupiah times `1e24 / rp_per_near` (Rp 4.3M is 0.043 NEAR at the demo rate); `matched_at_ns` is the block timestamp; `deadline_ns` stays empty until Funded. The caller check is a `require!` in the body instead of `#[private]`: the attribute only guards the compiled entry point, so a direct call in a unit test (or from other Rust code) is not rejected by it.

## 2026-11-12 Escrow (M1-04)
`deposit` (buyer, state Matched, exactly the stored price) starts a 7-day delivery window (`deadline_ns`); `confirm_received` (buyer, Funded) sets Released and pays the seller; `refund` (anyone, Funded, after the deadline) sets Refunded and pays the buyer; `expire` (anyone, Matched, more than 24 h after `matched_at_ns`) closes the deal as NoDeal. The 7-day window is my choice: the docs gave none, and it is a single constant (`DELIVERY_WINDOW_NS`) to change. State flips before the transfer so a second call cannot pay twice; `confirm_received` and `refund` return the payout `Promise`, so a failed transfer shows in the transaction result. Still open (S-05): a transfer to a deleted account bounces back to the contract with no recovery path, which is acceptable for the testnet demo. `no_owner_method_exists` reads the public method list from `src/lib.rs` and fails when one is added, so a new method is a conscious decision. Also dropped the ignored `[profile.release]` from `tee/Cargo.toml` (a non-root package's profile does nothing in a workspace and cargo warned about it).

## 2026-11-12 Matcher deployed to OutLayer (M1-06)
`tee/src/main.rs` replaces the spike: actions `get_pubkey` and `match` only (the spike's echoing `decrypt` is gone, with `scripts/spike-ecies.mjs`), answers `{"success":true,"result":...}` or `{"success":false,"error":...}`. Key derivation moved to `tee/src/key.rs` (HKDF-SHA256, info `blind-deal:ecies`, unchanged from the spike so a known-answer test still holds). Deployed on testnet as project `spike-82nkvzn7.testnet/blind-deal` (throwaway account; a team-owned account replaces it before the demo), WASM sha256 `789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904`, FastFS `https://test.fastfs.io/spike-82nkvzn7.testnet/outlayer.testnet/789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904.wasm`, secret `PROTECTED_DEAL_MASTER_SECRET` (hex32, profile `production`) generated in the TEE. TEE public key: `028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e` (`scripts/get-pubkey.mjs`). Verified on OutLayer: `match` with eciesjs ciphertexts returned `matched:true` with two different prices inside the range on two runs, so `rand`'s entropy works on the wasip2 runtime. A run takes about 25 s wall clock (the `outlayer` CLI's own wait times out earlier; use near-api-js with `waitUntil: "FINAL"`). Redeploying the WASM changes the hash but not the key; replacing the secret changes the key, and then `VITE_TEE_PUBKEY` must follow.

## 2026-11-12 Contract on testnet and first round trip (M1-07)
Deal contract deployed at `blind-deal-8fjw0art.testnet` (312 KB, `new(outlayer.testnet, <TEE pubkey>, spike-82nkvzn7.testnet/blind-deal)`; throwaway, redeploy with `scripts/deploy-contract.mjs`). `node scripts/roundtrip.mjs` creates a deal with two fresh faucet accounts, submits both limits and waits for OutLayer's answer: seller 4,000,000 and buyer 4,600,000 gave `state=Matched` at Rp 4,019,741 (inside the range, the callback landed within the submit's own transaction wait of about 5 s); seller 5,000,000 and buyer 4,000,000 gave `state=NoDeal`. Gate G1 passes: the OutLayer path works end to end, so the fallback matcher (F-01) is not needed.
**Secret access matters.** The first run failed with "Access denied by access condition": OutLayer checks the secret's readers against the transaction signer, and the secret was stored for the deployer only. Setting it to allow-all would let anyone replay the public on-chain ciphertexts as `match` requests and resample the random price, which reveals the overlap bounds (and so both limits). The secret is therefore set to `outlayer secrets access --access allow-all --via <contract>`: any signer may use it, but only through the deal contract, which asks once per round. The key is not yet locked to one WASM build (`--build <sha256>`); do that before the demo, and move the lock on each redeploy. `scripts/get-pubkey.mjs` now fails under this rule because it calls OutLayer directly: the pubkey is recorded above, and a direct check needs `--direct` access added back temporarily. A failed execution is indistinguishable from a no-deal in the contract (both end the round), so check the receipts when a round unexpectedly ends in NoDeal. Fee: the buyer's 0.0021 NEAR attach covered the run, with the unused part refunded to the buyer (charged about 0.001 NEAR). Env for the frontend: `VITE_CONTRACT_ID=blind-deal-8fjw0art.testnet`, `VITE_TEE_PUBKEY=028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e`.

## 2026-11-12 Contract hardening after integration review
`submit_limit` rejects a ciphertext over 512 bytes (an ECIES limit is about 200), because the contract pays storage for whatever it stores. The call that completes a round must attach a nonzero fee: without one OutLayer refuses and the round would silently end as a no-deal. The D1-04 stub's blanket `allow(dead_code, unused_variables)` is gone. Storage layout is unchanged, so a code-only redeploy to the same account is enough. Not changed: a deal can still stick in Computing if the callback itself panics; the M1-07 round trip landed the callback within about 5 s on 20 Tgas, so a timeout escape is left to Contracts & TEE.

## 2026-11-12 Data model follows the contract as built
docs/DATA-MODEL.md maps every piece of data to its one store; still no database, no relayer table, no deal index ("my deals" would be an optional read-only indexer, recorded here first). Its first draft proposed `Cancelled`/`Expired` states, a `price_rp`/`price_yocto` split and `rp_per_near` as a `new` argument; the contract shipped and deployed without them, so the page now documents the code instead: cancel and expire end in NoDeal, `price` is yoctoNEAR only (the app shows `price / 1e16` as Rupiah), and the rate is a constant.

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
