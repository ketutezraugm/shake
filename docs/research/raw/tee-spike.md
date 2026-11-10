# TEE spike: Blind deal (2026-11-10)

Method: official docs fetched via WebFetch/WebSearch (summarized by the fetch tool, so exact numbers should be re-checked before relying on them). Nothing was run or signed up for.

## 1. OutLayer (best fit)

- **Runs our own code in a TEE: yes.** Rust compiled to `wasm32-wasip2` (or p1), executed inside Intel TDX. Source: https://app.outlayer.ai/docs/getting-started , https://github.com/out-layer/outlayer
- **Triggers:** (a) NEAR contract calls `request_execution` on `outlayer.testnet`, with a callback via `.then()` that reads `env::promise_result(0)`; (b) HTTPS API (`testnet-api.outlayer.ai`) with a Payment Key. Source: https://app.outlayer.ai/docs/near-integration
- **Secrets / TEE-held keys: yes.** Manual secrets are "encrypted in your browser with ECIES" and only the TEE decrypts them. `PROTECTED_*` secrets (types include ED25519, hex32/64) are generated inside the TEE and never seen by anyone. They reach the WASM as env vars. Access can be locked to one exact WASM hash. Source: https://app.outlayer.ai/docs/secrets
- **Encrypted inputs:** the generic `input_data` is plain JSON in the tx. Docs do NOT cover encrypting general inputs. BUT the `private-dao-example` shows the pattern we need: browser ECIES-encrypts (eciesjs) a payload to a key derived from `PROTECTED_DAO_MASTER_SECRET` (HKDF per user), stores the ciphertext on-chain via `cast_vote`, and the WASM decrypts in memory and returns a result to the contract. Source: https://github.com/out-layer/private-dao-example (runs on testnet; gotchas below).
- **Result back to contract: yes**, via the callback above. Per-execution attestation is NOT verified on-chain ("prohibitively expensive"). The contract trusts the OutLayer contract's result (predecessor = `outlayer.testnet`) or a signature from a registered worker key. `vrf-example` verifies an Ed25519 proof in the callback with `env::ed25519_verify`. Sources: https://app.outlayer.ai/docs/tee-attestation , https://github.com/out-layer/vrf-example (contract in `vrf-contract/`)
- **Attestation:** TDX quote binds WASM sha256, input, output and worker. Verified off-chain (Intel collateral, `is_measurements_approved` on `worker.outlayer.testnet`). It proves "this WASM hash produced this output in genuine TDX", not that the logic is honest. Our code must be public and hash-pinned. Source: https://app.outlayer.ai/docs/tee-attestation
- **Cost / limits:** fee = base + instructions x rate + ms x rate. Rates are not published on the docs page (use the `estimate_execution_cost` view). Defaults: 1B instructions, 128 MB, 60 s. Max: 500B instructions, 4096 MB, 180 s. Unused deposit is refunded, failures are not. Network access is not documented. Sources: https://app.outlayer.ai/docs/pricing , near-integration. Testnet cost is probably cheap (private-dao examples attach about 0.05-0.1 NEAR).
- **Trust caveats (state honestly in the pitch):** the repo README says governance is not decentralized yet (single OutLayer-held keys for DAO, measurement approval, upgrades), and the coordinator is private. So "operator can't read" means "our server can't read", while OutLayer is still a trusted party. Source: README.
- **Closest examples:** `private-dao-example` (ECIES in browser, TEE decrypt and compute, result to contract); `vrf-example` (TEE random plus on-chain verify callback). Index: https://app.outlayer.ai/docs/examples . The random price inside the overlap can use `random-example`'s TEE entropy, or hash(secret, nonce, deal_id).
- **Gotchas from private-dao:** `PROTECTED_` secrets cannot be hand-supplied or rotated. Use BigInt for u64 timestamps, and hash the same encoding on client and TEE. The "attestation" in that demo is an `mvp-attestation:` string (do not oversell it). `vault_id` must be present, even if null.

## 2. NEAR AI Cloud (LLM only)

- Docs: https://docs.near.ai/ . Models run in TEEs (CPU TDX plus GPU TEE). Verification index: https://docs.near.ai/cloud/verification
- **Attestation:** `GET /v1/attestation/report?model=...&signing_algo=ed25519&nonce=<random 32-byte hex>` (no API key needed). It returns `signing_address`/`signing_public_key`, `intel_quote`, and `request_nonce`, with report_data = signing_address plus nonce. A verifier checks the TDX quote and the GPU evidence, plus nonce freshness. Response signatures come from `/v1/signature/{chat_id}`. Sources: https://docs.near.ai/api-reference/attestation/get-attestation-report , https://docs.near.ai/cloud/verification/gateway
- **E2EE from a client: yes, documented.** Fetch and verify the model key from the attestation report, then send headers `X-Signing-Algo: ed25519`, `X-Client-Pub-Key`, `X-Model-Pub-Key`, `X-Encryption-Version: 2`, `x-no-aliasing: true`. Scheme: Ed25519 to X25519 ECDH, HKDF-SHA256 (info `ed25519_encryption`), XChaCha20-Poly1305, with hex content. Only message content is encrypted by default (model name and other fields are visible). It works on chat completions but not the Responses API. The docs examples use Node `crypto`/`Buffer`, so browser use needs porting (noble libs are fine). Sources: https://docs.near.ai/cloud/guides/e2ee-chat-completions . Unconfirmed: which models support E2EE (the example is `z-ai/glm-5.3-flash`).
- **Custom non-LLM code: no.** It is an inference API only.
- **Pricing (third-party aggregator, not official, verify):** GPT-OSS 120B about $0.15/$0.55 per 1M tokens, Qwen3 30B-A3B about $0.15/$0.55, Qwen 3.6 35B-A3B about $0.17/$1.10. A parse call of about 300 tokens costs well under $0.001. Source: https://custom.typingmind.com/tools/estimate-llm-usage-costs/nearai
- **Implication:** the browser can call NEAR AI Cloud directly (E2EE) to turn text into structured numbers, then encrypt the numbers to the OutLayer TEE key. No server is involved. Risk: the API key must live in the browser, or a thin proxy forwards ciphertext only. Fallback: skip the LLM or run it client-side with a template parser.

## 3. Shade Agents (NEAR + Phala dstack)

- Docs: https://docs.near.org/ai/shade-agents/quickstart/components (paths moved between versions), template https://github.com/NearDeFi/shade-agent-template (TypeScript/Hono ETH oracle).
- Flow: `npm i -g @neardefi/shade-agent-cli`, `shade auth set all testnet create-new`, edit `deployment.yaml` and `.env`, Docker login, free Phala Cloud account plus API key, then `shade deploy` (local mode first, then `environment: TEE`). The agent registers in a NEAR agent contract after TEE attestation (measurements and PPID approved). Registration expires after about 7 days. The contract then checks `agent` registration and not a per-message quote. This matches our "TEE key registered in contract" model. The Shade Agent framework is unaudited (template warning). Sources as above.
- Setup-time estimate (my judgement, docs give none): 3-6 h for first deploy if Docker, Phala and NEAR accounts go smoothly, plus a day if the TEE registration fails. You also need a public Docker image, and a Phala deploy that costs money or credits (unspecified).
- Compared with OutLayer: Shade gives a long-running HTTP server with a TEE key (more flexible, includes the LLM and encrypted-input handling), but needs more infra (Docker, Phala, registration expiry, own agent contract). OutLayer needs only a WASM build and CLI upload.

## 4. Recommendation

**Primary: OutLayer WASM + ECIES in browser (private-dao pattern).**
1. Generate `PROTECTED_` secret (ED25519/hex32) in the TEE. The WASM derives a deal public key from it and exposes it via a `get_pubkey` execution, or the contract stores the pubkey.
2. Browser (buyer/seller): LLM parse (optional, NEAR AI Cloud E2EE) gives `{min,max}`. ECIES-encrypt to the deal key. Call our contract `submit_limit(deal_id, ciphertext)`. The server never sees plaintext (the server can be just a static host or nothing).
3. When both are in, the contract calls `outlayer.testnet.request_execution` with both ciphertexts. The WASM decrypts, compares, and if the ranges overlap, picks a random price in the overlap (TEE entropy). It returns `{deal_id, matched, price}` only, with no limits and no losing-side values.
4. Callback `on_outlayer_result` checks that the predecessor is `outlayer.testnet` (or ed25519 signature check as in vrf-example) and then runs escrow.
5. Pitch honestly: "Operator cannot read limits, assuming TDX plus the public hash-pinned WASM. OutLayer governance is still centralised." Show the WASM hash and the attestation link in the UI.

Leak caveat: the match/no-match bit and the price leak some information by design. Rate-limit retries per deal, or use a single-shot deal.

**Setup estimate:** 1.5-2 days for 2-3 devs. Day 1: WASM compare logic (pure Rust, unit-testable offline), build, upload, secret. Contract plus callback in parallel. Day 2: browser ECIES, escrow, UI, attestation display.

**Biggest unknowns:**
- Network access, testnet fee rates and the actual availability of testnet workers (not documented; try a `random-example` call on the first morning).
- Whether `PROTECTED_` ed25519 secrets can be used for ECIES decryption and for signing (private-dao proves the HKDF path).
- Contract-level trust: it trusts the OutLayer contract, not our own TEE key.
- Whether NEAR AI Cloud E2EE works from a browser (CORS plus the API key in the client).

**Fallback ladder (decide by the end of day 1):**
1. If OutLayer testnet fails, fall back to a Shade Agent or plain server with the same API. Contract accepts a signature from the server's registered key. Be honest: "operator is trusted, TEE planned".
2. Commit-reveal with no server compare: both commit `hash(limit, salt)`. After both commit, both reveal. The contract compares and picks the price from `block random_seed`. The price limits are revealed to the counterparty, so it is weaker (the loser's limit leaks) and a party can refuse to reveal (needs a deposit and timeout slash). It is the fallback that needs no TEE.
3. LLM fallback: deterministic regex or form fields instead of the LLM.

Keep the same contract interface (`submit`, `resolve(result)`) across all three so the swap costs about half a day.
