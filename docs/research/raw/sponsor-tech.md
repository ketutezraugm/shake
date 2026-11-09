# NEAR sponsor tech: verified notes (2026-11-09)

Method: WebFetch/WebSearch of official docs, `gh api`, `npm view`, live curl and testnet RPC. Anything not confirmed is marked UNVERIFIED.

## 1. NEAR Intents / 1Click API
- Flow: query tokens, request quote, send deposit to the quote's deposit address, track status. Source: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/introduction.md
- Base URL `https://1click.chaindefuser.com`, under `/v0`: `GET /tokens`, `POST /quote`, `POST /deposit/submit` (optional), `GET /status?depositAddress=...`. Source: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request.md
- `dry: true` validates parameters and returns a quote without executing; `dry: false` gives the real deposit address. `deadline` is an ISO timestamp for quote expiry (example: 3 minutes). Same source.
- CORRECTION to the brief: without a JWT you pay an extra 0.25% (25 bps) platform fee on every non-ANY_INPUT quote. With a partner JWT (Partner Dashboard, sent as `X-API-Key` or Bearer) the fee is typically 20 bps, or 1 bp on stablecoin and same-asset multichain routes. JWT is optional. Rate limits are not documented. Source: https://docs.near-intents.org/integration/distribution-channels/1click-api/authentication.md
- No testnet: "There is no testnet version of NEAR Intents - use small amounts for test swaps." Source: quickstart page above.
- Chains (list is expanding): 15 EVM (Arbitrum, ADI, Aurora, Base, Bera, BNB, Ethereum, Gnosis, Optimism, Plasma, Polygon, Avalanche, Monad, XLayer, Scroll); Bitcoin, Dogecoin, Zcash, Bitcoin Cash, Litecoin, Dash; Aleo, Aptos, Cardano, NEAR, Solana, Stellar, Sui, TON, Tron, XRP, Starknet. Source: https://docs.near-intents.org/resources/chain-support.md
- SDK: `@defuse-protocol/one-click-sdk-typescript` (docs: https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk.md). npm latest 0.1.26 (`npm view`). GitHub repo defuse-protocol/one-click-sdk-typescript, last push 2026-09-22, no GitHub releases. Go and Rust SDKs also listed.

## 2. Chain Signatures
- MPC contract: testnet `v1.signer-prod.testnet`, mainnet `v1.signer`. Source: https://docs.near.org/chain-abstraction/chain-signatures/implementation.md. I confirmed `v1.signer-prod.testnet` exists via testnet RPC (https://rpc.testnet.fastnear.com).
- `sign` takes `payload`, `path` (derivation path, e.g. `ethereum-1`), `domain_id` (0 = Secp256k1, 1 = Ed25519). Use a distinct path per chain for replay safety. Source: https://docs.near.org/chain-abstraction/chain-signatures
- Five steps: derive foreign address, build tx, request signature, format signature, relay. EVM uses an adapter with a `publicClient` and ECDSA. Bitcoin uses an adapter with `network` and an RPC adapter, ECDSA, one NEAR signing call per UTXO. Solana uses an adapter with a connection and EdDSA over the serialized message. Source: implementation page above.
- SDK: `chainsig.js` npm 1.1.16, last modified 2026-05-12 (`npm view`). Repo linked from docs: https://github.com/NearDeFi/chainsig.js (I did not pull its metadata; the gh path I tried returned 404).

## 3. NEAR AI Cloud
- TEE inference; providers and NEAR cannot read data. Verify genuineness cryptographically. Source: https://docs.near.ai/cloud/introduction
- OpenAI-compatible: base URL `https://cloud-api.near.ai/v1`, generate key in dashboard (cloud.near.ai). Source: https://docs.near.ai/cloud/quickstart.md
- Models and per-1M-token prices are live at https://cloud-api.near.ai/v1/models (queried today, 66 entries). Examples, input/output USD: `z-ai/glm-5.3` 1.8/5.75; `z-ai/glm-5.3-flash` 0.08/0.5; `Qwen/Qwen3.8-27B` 0.04/1.35; `qwen/qwen3.5-397b-a17b` 0.5/3.3; `deepseek/deepseek-v4.1-flash` 0.3/1.2; `openai/gpt-5-nano` 0.05/0.4; `anthropic/claude-sonnet-5-5` 2/10. The catalog also proxies Anthropic, OpenAI, Google and xAI models. UNVERIFIED which of these run inside a NEAR TEE versus being proxied; the intro says open-weight GLM/Qwen/GPT-OSS are hosted in TEEs.
- Attestation: gateway attestation, model attestations, TLS and image provenance, response signature. Browser verifier at cloud.near.ai/verify. Source: https://docs.near.ai/cloud/verification.md
- $10 credit via nearbuilders.org/join: UNVERIFIED. The join page (https://nearbuilders.org/join) mentions no credit. Search found only $5 hackathon coupons, redeemed at cloud.near.ai Credits tab (https://app.notion.com/p/Claiming-NEAR-AI-Cloud-Credits-2e6da22d7b6483deb74901226d383df2, https://near-foundation.notion.site/Applied-Intelligence-Hackathon-NEAR-AI-d2cda22d7b6482559ff2017ed5188233). Docs say to purchase credits. Ask the organizers for the coupon.

## 4. Contract SDKs, tooling, keys
- near-sdk-rs: `near-sdk` v5.30.1 (tag near-sdk-v5.30.1, 2026-11-05). `near-contract-standards` 5.30.1. Repo pushed 2026-11-05. Source: `gh api repos/near/near-sdk-rs/releases`. Docs: https://docs.near.org/tools/sdk.md
- near-sdk-js: v2.0.0 (2024-06-07), repo ARCHIVED (`gh api repos/near/near-sdk-js --jq .archived` = true). Do not start new work on it; use Rust.
- near-cli-rs: v0.31.1 (2026-11-05).
- near-api-js: 7.4.0 (2026-10-23); `npm view near-api-js version` = 7.4.0. The docs page https://docs.near.org/tools/near-api lists `near-api-js` and `near-kit` (npm 0.20.2), and does not mention `@near-js/*`. `@near-js/accounts` is 2.5.1, last modified 2025-11-06, so treat it as stale. Rust: `near-api-rs` v0.8.7 (2026-10-28).
- Faucet: docs.near.org built-in faucet (native testnet NEAR only) and https://near-faucet.io for fungible tokens; either may be out of tokens. Amounts are not documented. Source: https://docs.near.org/getting-started/faucet.md
- Function-call keys: one receiver contract only, optional method list (omitted = all methods), no attached NEAR. Allowance caps gas; omitted allowance = unlimited. Allowance cannot be changed (add a new key). No maximum documented. Source: https://docs.near.org/protocol/access-keys
- Meta transactions (NEP-366): user signs a `DelegateAction`, relayer wraps and pays gas. One delegate action per tx, no nesting, single receiver, user still needs an initialized account with an access key, and function-call key allowance is not checked. DelegateV2 was rejected from protocol 87. Source: https://docs.near.org/protocol/transactions/meta-tx.md. Relayer tutorial: https://docs.near.org/web3-apps/tutorials/meta-transactions.md

## 5. Wallet login
- NEAR Connect (new connector) lists HOT, Meteor, Nightly, WalletConnect and 10+ others. Docs: https://docs.near.org/tools/near-connect.md. Repo azbang/near-connect (pushed 2026-11-07). npm `@hot-labs/near-connect` 0.12.0 maps to repo hot-dao/near-selector; UNVERIFIED that this is the canonical package for the docs page. The page gives no install command.
- Wallet Selector (`@near-wallet-selector/core` 10.1.4): last release 2025-12-04, last push 2026-03-01. Docs now point to NEAR Connect, so prefer Connect (my inference; no deprecation notice read).
- Social/email: Privy plugin for NEAR Connect; manifest has `testnet: true` and `network: 'testnet'` works in the connector. Source: https://docs.near.org/web3-apps/tutorials/privy.md
- NEAR Auth (Google, Apple, email, passkeys via Auth0 + MPC at `fast-auth.near`): "Mainnet requires approved credentials"; testnet details not given in the page, code samples are mainnet. Packages `@fast-auth-near/react-sdk`, `@fast-auth-near/browser-sdk`. Source: https://docs.near.org/web3-apps/tutorials/near-auth.md
- UNVERIFIED: Meteor/HOT on testnet specifically.

## 6. Sponsor products
- OutLayer: TEE (Intel TDX) wallets that sign for NEAR, EVM and Solana, plus WASI programs run in an enclave with signed results; call from a NEAR contract (`request_execution`) or HTTPS. Testnet works: contract `outlayer.testnet` (exists on RPC), API `https://testnet-api.outlayer.ai`; mainnet `outlayer.near`, `https://api.outlayer.ai`. Auth is `X-Payment-Key` or trial `Authorization: Bearer wk_...` (no `X-API-Key`). One day: run an example agent from the docs and call it over HTTPS on testnet. Source: https://app.outlayer.ai/llms.txt (full text: https://app.outlayer.ai/llms-full.txt). Pricing and limits not read.
- Agent Market: marketplace to hire agents per job with held payment; also MCP and A2A access; list a self-hosted agent "in 10 minutes". One day: list a simple agent or hire one over MCP. Testnet: UNVERIFIED (docs index shows no testnet page; I did not read the full docs). Source: https://docs.market.near.ai/llms.txt, https://docs.market.near.ai/faq.md
- Trezu: non-custodial multichain multisig treasury on top of Sputnik DAO (https://trezu.app). No developer docs or testnet info found (UNVERIFIED). A day: use it as the end-user treasury UI, or drive the underlying DAO via CLI.
- Sputnik DAO v2: factory repo near-daos/sputnik-dao-contract, latest release 3.0.0, last push 2026-05-27. `sputnikv2.testnet` exists on testnet RPC (account has contract code), but I did not confirm it is the live factory interface (UNVERIFIED). A day: create a DAO sub-account via the factory and submit a proposal.
- meme.cooking: NEAR memecoin launchpad (https://meme.cooking). No official API docs found; only a third-party repo Shitzu-Apes/meme-cooking-docs (last push 2024-10-31). UNVERIFIED API and testnet; treat as high-risk to depend on.
- Rhea (Rhea Finance, formerly Ref): swaps run on NEAR Intents (https://rhea.finance). Official SDK docs not found. npm `@rhea-finance/cross-chain-aggregation-dex` 0.2.3 (via https://www.pkgstats.com/pkg:@rhea-finance/cross-chain-aggregation-dex); I saw `@rhea-finance/cross-chain-sdk` 0.1.22 on npm but did not inspect it. Testnet UNVERIFIED; assume mainnet-only.

## 7. Standards (https://github.com/near/NEPs/tree/master/neps)
- NEP-141: fungible token (ft_transfer, ft_transfer_call, storage_deposit). Guide: https://docs.near.org/integrations/fungible-tokens.md. Reference impl: `near-contract-standards` in near-sdk-rs.
- NEP-171: non-fungible token (nft_transfer, nft_token). Reference impl: same crate. Status read: only that the file exists.
- NEP-245: multi token standard, Status Final (read from https://raw.githubusercontent.com/near/NEPs/master/neps/nep-0245.md). NEAR Intents holds multi-asset balances through it (my recollection, not verified here).
- Status of 141/171 not read in this session; both are long-standing Final standards from memory.

## Summary table

| tech | testnet? | free? | SDK + version | setup (h) | gotchas |
|---|---|---|---|---|---|
| 1Click / Intents | No (mainnet, small amounts) | API free; fee 0.25% extra without JWT, ~0.2% with | @defuse-protocol/one-click-sdk-typescript 0.1.26 | 2-3 | Real funds; quotes expire; use `dry:true` to demo; rate limits undocumented |
| Chain Signatures | Yes (`v1.signer-prod.testnet`) | Testnet free; signing needs deposit/gas | chainsig.js 1.1.16 | 3-5 | One path per chain; BTC signs per UTXO; target chain still needs gas and RPC |
| NEAR AI Cloud | n/a (hosted) | Paid; credit coupon from organizers ($5 seen, $10 unverified) | OpenAI SDK, base `https://cloud-api.near.ai/v1` | 1 | Not all catalog models are TEE-run (unverified); prices change, query `/v1/models` |
| near-sdk-rs / CLI | Yes | Yes | near-sdk 5.30.1, near-cli-rs 0.31.1 | 2-4 | near-sdk-js archived; faucet may be empty |
| near-api-js / near-kit | Yes | Yes | near-api-js 7.4.0, near-kit 0.20.2 | 1-2 | `@near-js/*` packages stale; docs now list near-kit |
| Function-call keys / meta tx | Yes | Gas by relayer | near-api-js | 2-4 | One receiver, no deposit; meta-tx ignores allowance; DelegateV2 removed |
| NEAR Connect / Privy | Yes (Privy plugin lists testnet) | Free | @hot-labs/near-connect 0.12.0 (unverified canonical) | 2 | Wallet Selector looks legacy; NEAR Auth mainnet needs approved credentials |
| OutLayer | Yes (`outlayer.testnet`) | Trial key; pricing unread | HTTPS API, WASI | 3-6 | Use `api.` host not `app.`; no `X-API-Key` |
| Agent Market | Unverified | Held-payment per job | MCP / A2A | 2-4 | Testnet unknown; fees in payments docs unread |
| Trezu | Unverified | Unknown | none found | 1 | No dev docs found |
| Sputnik DAO v2 | Yes (`sputnikv2.testnet` exists) | Testnet free | near-daos/sputnik-dao-contract 3.0.0 | 2-3 | Factory interface unconfirmed |
| meme.cooking | Unverified | Unknown | none found | 2+ | No official API docs found |
| Rhea | Unverified | Unknown | @rhea-finance/cross-chain-aggregation-dex 0.2.3 | 2-4 | Official SDK docs not found; likely mainnet only |
