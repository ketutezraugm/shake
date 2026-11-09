# Competitor profiles B (public info, checked 2026-11-09)

Picks: **TokenGo** (games): the only games repo with 67 commits over 3 days, a live server, 292 tests, a deployed contract. **$BEFEWER** (memecoins): 70 commits, custom Rust contract, live site, Ref pool, 83 contract tests; runner-up LIFO (Python model, CI badges, 94 commits) is also serious. Weaker games repos (Maven 1 commit, DUEL 14 commits/2h, Afterlight) were passed over.

## 1. Penstock (privacy, realworld) - THREAT: HIGH
- **Idea/user:** x402 paywall for APIs/MCP; agents pay from any chain, seller receives USDC on NEAR. Target: API sellers monetizing to agents.
- **Stack:** TypeScript pnpm monorepo (proxy, console React/Vite, core), 702 KB, MIT.
- **NEAR tech:** NEAR Intents 1Click plus `@x402/near`. One REAL mainnet payment and refund documented (docs/PROOF.md, Solscan/NearBlocks links). No own contract. Demo mode is simulated and clearly labelled.
- **Progress:** 64 commits 1-8 Nov (32 on day 1), solo. Static hosted demo with live mainnet read view; no CI.
- **Quality/polish:** Clean typed code, HMAC journal, signed ed25519 receipts, many test files, a "do X, see Y" README with an honest-limits section. Very screener-friendly (`pnpm demo`).
- **Strengths:** Intents live on mainnet, real proof, strong design/landing, clear impact. **Weaknesses:** no smart contract, settlement depends on a hand-approved facilitator, local-only journal, thin on privacy track fit.
- **Beat it by:** shipping a one-click hosted full-stack (not simulated) Intents flow with a seller-facing on-chain component (escrow/receipt contract), and a stronger privacy angle.

## 2. Petty Cash (realworld, social) - THREAT: MEDIUM-HIGH
- **Idea/user:** Sputnik DAO budgets with rules; small payments auto-approved, large escalate to council. Target: community DAOs, meetup organizers, AI-agent spenders.
- **Stack:** Rust NEAR contract (707 lines, 24 tests), vanilla JS/Vite, Vercel serverless API, test USD token.
- **NEAR tech:** Real contract `pettycash.testnet` (verified live via RPC), integrates Sputnik v2 via role + proposals, FT storage handling. Testnet only; no Intents.
- **Progress:** 19 commits in one evening (2 Nov), then silent; solo. Demo returns 200; the server signs with limited function-call keys.
- **Quality/polish:** Tight Rust, a verify script (`scripts/verify.mjs`) checking on-chain invariants, 2-minute README, Spanish asset names (minor). Gimmick 3D gate visuals plus sound.
- **Strengths:** Best problem framing and real on-chain composition, with a runnable proof. **Weaknesses:** no commits after day 2, testnet, demo uses a shared server key, no token/Intents depth, modest UI.
- **Beat it by:** mainnet Sputnik install, multi-DAO onboarding UI with a real wallet, and more activity/polish during the final week.

## 3. TokenGo (games) - THREAT: HIGH
- **Idea/user:** Location-based browser game where loot is AI-compute shards (NEP-245), compiled into NEAR AI Cloud credits; chain hidden from players. Target: casual mobile players.
- **Stack:** TypeScript monorepo (server, web), Rust MT contract, Docker, Railway, 60 MB repo with docs/video/art.
- **NEAR tech:** `tokengo.testnet` live (RPC verified): NEP-245 mint/move/burn, NEP-413 login, NEAR AI Cloud pipe built but credits simulated in the public season. No Intents.
- **Progress:** 67 commits 6-8 Nov, solo, play link returns 200, judges' pass link, 76 s video, `npm run verify` for AI triage, 292 tests, 36 e2e flows.
- **Quality/polish:** Very high: 13 design docs, SUBMISSION.md, anti-cheat, economy simulator. Risk: over-scoped; real credits not switched on.
- **Strengths:** Matches the "judged on game loop, chain hidden" brief; technical depth and polish. **Weaknesses:** simulated credits, testnet only, solo and heavy README may read as AI-generated bulk.
- **Beat it by:** a game that is fun in 30 seconds with a real-money loop (mainnet, real Intents payout) and less to read.

## 4. $BEFEWER (memecoins, also games) - THREAT: HIGH
- **Idea/user:** No-premine memecoin mined by winning a sealed-bid minority game (drand timelock); fees fund buyback-and-burn. Target: degens and game players.
- **Stack:** Rust contract (2104 lines, 83 tests), Svelte web, Node keeper (opener, autopilot, deploy), Playwright e2e scripts.
- **NEAR tech:** `v6.befewer.testnet` (live), NEP-141 token and game in one account, Ref Finance pool #2911, auto-created accounts. Testnet only; no Intents. Wasm hash published.
- **Progress:** 70 commits 6-9 Nov (pushed today), solo, befewer.com 200.
- **Quality/polish:** High: ledger invariants shown in-UI, strategy replay, README "do X, see Y" with curl check, honest scope. Mechanism (ORE-inspired) is a derivative idea, but well executed.
- **Strengths:** Original-ish mechanics, real contract plus DEX, strong sustainability story (revenue buyback). **Weaknesses:** testnet only, 3 min rounds with thin real player activity, token economics unaudited, gambling optics.
- **Beat it by:** mainnet launch with real players/volume data, simpler onboarding, and a security review of the mechanism.

## Field quality (games + memecoins + social)
Sampled READMEs of 10 repos (TokenGo, BEFEWER, Maven, DUEL, Afterlight, Tripwire, Rascals, Four Horsemen, LIFO, Petty Cash; an 11th, $HACK, is an empty repo, 15 bytes). About 6 are serious, working builds with a deployed testnet contract and live demo (TokenGo, BEFEWER, LIFO, DUEL, Petty Cash, Rascals), 3 are credible but thinner (Four Horsemen: 2 commits on day 9 and a pure contract; Afterlight and Maven: 1-18 commits, Maven 1 commit and local-only), and 1 is an empty placeholder. Bar: high at the top (CI, 80-290 tests, "do X, see Y" READMEs written for AI screening), but the median is a 1-3 day solo sprint on testnet. Nobody sampled is on mainnet except Penstock's one payment; mainnet usage and real players are the open differentiators.
