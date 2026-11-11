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

## 2026-11-11 Private rounds replace "one attempt"
Team feedback: one attempt punishes misjudgment. Seller chooses 1-3 rounds per buyer (default 2); concessions are monotonic (buyer up, seller down), enforced in the TEE; each round leaks at most 1 bit; a deal ends the game. Laddering accepted as private haggling. "Close" hint dropped (leaks more). Contract: `max_rounds`, `round`, per-round ciphertexts, `Retry` state. (IDEAS.md, feedback section)

## 2026-11-11 Red-team fixes (ENDGAME.md)
Default tracks privacy + realworld (agents only if S-02 ships). README and `.env.example` default to the hosted relayer and deployed contract so a clean clone runs without secrets. Token freeze 11-12 12:00 UTC. Cut: Bahasa toggle, receipt page (explorer links instead). Sustainability story: 0.5% fee on settled deals; marketplaces embed the link.

## 2026-11-11 Git workflow: main + dev, PR-only, no force pushes
`main` holds releases only (release PRs from `dev`, merge commit, tagged v0.1.0 / v0.9.0 / v1.0.0, two approvals incl. Ezra). `dev` is the default integration branch; task branches `<role>/<task-id>-<name>`; squash-merge by the author after 1 review + green CI; merge `dev` into branches instead of rebasing so no force push is ever needed. Enforced by `.githooks/pre-push` (blocks main/dev pushes and non-fast-forward pushes) and `.claude/settings.json` deny rules (force push, main/dev push, --no-verify, PR merge/approve). Server-side branch protection needs GitHub Pro on a private repo (open question). (docs/CONTRIBUTING.md)

## 2026-11-11 AI integrator, owner override, AI-to-AI channel
Ezra: reviews and merges are done by AI, gated to the Backend & Integration person's session; Ezra can override any rule. Static deny rules replaced by `.claude/hooks/guard.mjs` (checks `gh api user` against `.github/ROLES`; `BD_OVERRIDE=1` works only for the owner). AIs coordinate through GitHub issues labelled `to:<role>`, PR reviews and HANDOFF sections; shared commands `/inbox`, `/ship`, `/review-pr`, `/release` in `.claude/commands/`. Supersedes "a human merges" in the entry above.
