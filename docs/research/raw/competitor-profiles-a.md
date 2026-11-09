# Competitor profiles A (public info, 2026-11-09)

Method: gh api (README, tree, commits, contributors), curl of live sites (Firecrawl keyless unavailable; SPA sites read as shell only, so demo behaviour was not browser-tested), skim of core source. Nothing was run locally.

## 1. nearbi (threat: MED-HIGH)
- Idea/user: autonomous agent selling evidence-first NEAR onchain research reports (Quick Answer $29/$49, Deep Dive $499). Buyers: analysts, funds, DAOs.
- Stack: Python agent (111 .py/.ts files, many tests), NEAR AI Cloud inference, DynamoDB, BigQuery, Rust splitter/forwarder contracts, nearbi.ai site (HTTP 200, clear editorial hero, ledger page).
- NEAR: real mainnet. Splitter/forwarder contracts with no full-access keys, 90/10 split, 1Click/Intents deposit addresses, USDC settlement, on-chain record_cost/anchor_report. One real mainnet sale (29 USDC, 2026-11-03).
- Progress: 100 commits in 3 days (Nov 3-5), last push Nov 5, single-looking effort. Honest README: auto order path only proven on testnet; Deep Dives still human.
- Quality: hash-chained public ledger, reproducible SQL + SHA-256 manifests, config-driven operator rules. Strong rigor. Needs operator keys to run `make demo`, so screening bot cannot fully reproduce.
- Polish: strong README, live domain, thesis dashboard.
- Strengths: only one with real revenue, mainnet Intents, two tracks (04 + 02), originality of "data rejected our hypothesis".
- Weaknesses: demo not reproducible without secrets; sustainability depends on one buyer niche; agent autonomy partly unproven; UI is report-site, not product.
- Beat it: ship a live, keyless, reproducible demo with real autonomous end-to-end mainnet orders and a visible repeat customer; stronger visual product design.

## 2. Writ (threat: HIGH on technical, MED overall)
- Idea: vendor of an AI agent backs it with money: named guarantor locks funds on NEAR, named arbiter rules claims. "Who pays when your agent gets fooled."
- Target: AI-agent vendors, guarantors/insurers, enterprises (GLEIF vLEI mandate credentials).
- Stack: Rust near-sdk contract (lib.rs 158KB, exact.rs 150KB, bench.rs 230KB, fuzz, mutation testing CI), TypeScript app, single-page web demo at writ.zuemen.net (200, clean Inter/light design, browser signs testnet txs).
- NEAR: real contract, testnet ONLY (stated). 8 real txs via live site. No Intents. Uses FT/USDC mock.
- Progress: 100 commits Nov 2-5; sole contributor; CI badge, `make verify`, CHANGELOG, SECURITY.md.
- Quality: exceptional test depth (126-attack bench, fuzz, mutants). Very honest README, even admits thin market and no customer.
- Polish: README maps directly to the five judging criteria; interactive "be the arbiter" demo.
- Strengths: technical implementation, originality, verifiability by screening bot (make verify).
- Weaknesses: testnet only; impact "unproven" by its own admission; dense, text-heavy README; mock tokens; concept complex (KERI/vLEI) to explain in 2 min.
- Beat it: mainnet deployment, real users/pilot, simpler story, better visual design; originality parity is hard.

## 3. NEAR Books (threat: MED)
- Idea: re-runnable audit of NEAR tokenomics plus TEE-attested daily record on mainnet; thesis: Intents revenue is real but buybacks are held not burned, covering ~17% of new supply; six on-chain predictions.
- Target: investors, researchers, NEAR community.
- Stack: stdlib Python pipeline, Rust contract (nearbooks.near, 55KB + 62KB tests), OutLayer TDX worker, GitHub Pages dashboard (200, Source Serif/DM Mono, editorial style), MCP server, GitHub Action keeper.
- NEAR: mainnet contract with 1 attested snapshot, 6 pending predictions; reads Intents data. Intents used as data subject, not as a rail.
- Progress: 63 commits Oct 20-21, one on Nov 2; stalled for 2 weeks. 4 stars. Solo.
- Quality: 185 tests, `make verify` runs offline in 3s, 17/17 findings; strong reproducibility for screening.
- Polish: good README with dashboard screenshot, claims-checked doc, THESIS.md; clean site.
- Strengths: thesis rigor, attestation depth, runs easily.
- Weaknesses: pre-built early; only 1 mainnet snapshot; no users, no revenue; narrow audience; little recent momentum.
- Beat it: a thesis with a more decision-useful, live-updating dashboard and tradeable/actionable output; more recent data.

## 4. Warrant (threat: HIGH)
- Idea: fully collateralised options market where collateral is locked inside intents.near until expiry; no oracle, no default. Options are NEP-245 tokens; EVM wallets participate via 1Click and a gas relayer.
- Target: DeFi traders and writers on NEAR/cross-chain.
- Stack: Rust contract (split modules, invariants tests, 78 unit + 4 on real Intents bytecode, sandbox/devnet tests), React/TS web (ActionSheet 46KB), Vercel app (200, SPA, reads mainnet in browser, no backend), OG image, film on X.
- NEAR: deepest Intents use of the four: real mainnet contract warrant-options.near, source-verified on NearBlocks, key-less locked; 31 real mainnet txs (28 refusals, 3 honest calls); NEP-245, 1Click, execute_intents relayer.
- Progress: 60 commits in about 15 hours on Nov 5 (looks AI-agent-driven: AGENTS.md, CLAUDE.md, docs/DECISIONS, EVIDENCE E-001..E-045); last push Nov 5; solo.
- Quality: invariants, evidence log, candid Limits section (not audited, no patching, EVM only via local key, tiny series authored by owner).
- Polish: best package: badges, hero image, rendered screenshots at 390/1440, in-browser verification, step-by-step "Try it" with no install.
- Strengths: technical + design + originality in DeFi; Intents-native; screening bot can verify via Node script.
- Weaknesses: zero real market activity; self-authored demo series; contract cannot be patched; sustainability (no fee model visible); `retire` only testable after 2026-11-26.
- Beat it: real counterparty activity/liquidity, fee/sustainability story, wider wallet support, or a different category with live usage.

## Ranking
Warrant > Writ > nearbi > NEAR Books on overall judge appeal; nearbi is the only one with real revenue. Common gap across all four: no real user traction beyond one sale.
