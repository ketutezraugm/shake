# NEAR Hackathon track prompts (nearai/near-hackathon-prompt-examples, tracks/)

Source: https://github.com/nearai/near-hackathon-prompt-examples/tree/main/tracks
Fetched 2026-11-09. Each track: wants, NEAR tech/URLs, judging hints, example idea. Max 120 words per track.

## 01 Unstoppable DeFi (`defi`)
- **Wants:** Exchanges, perps, lending, vaults, trading agents settling cross-chain via NEAR Intents, no custodian.
- **NEAR tech:** NEAR Intents, 1Click API, Chain Signatures, Agent API. Stretch: NEAR contract owns vault, Chain Signatures control a derived BTC address.
- **URLs:** https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart ; https://docs.near.org/chain-abstraction/chain-signatures/getting-started ; https://guide.rhea.finance/ ; https://docs.agentsonintents.com/integration/agent-api/overview ; https://intents.aurora.dev/
- **Judging hints:** Dry-run mode fetching real quotes with no funds; show REFUNDED/FAILED states; show where funds sit at each step.
- **Example idea:** Cross-chain DCA vault (USDC from any chain into BTC/ETH/NEAR at the user's address, slippage limit).
- **Process note:** Asks agent to read quickstart and wait for OK before building.

## 02 Investment Thesis (`thesis`)
- **Wants:** Evidence-first long-term NEAR thesis with reproducible onchain analytics, dashboards, models.
- **NEAR tech:** BigQuery public dataset `bigquery-public-data.crypto_near_mainnet_us` (filter on `block_date`); NEAR Intents Explorer API (JWT from partner dashboard).
- **URLs:** https://docs.near.org/data-infrastructure/big-query ; https://docs.near.org/data-infrastructure/what-is ; https://docs.near-intents.org/integration/distribution-channels/1click-api/explorer/introduction
- **Judging hints:** "Score depends on evidence someone else can reproduce." One command rebuilds all charts; THESIS.md must include counter-evidence and what would change the mind; never invent numbers.
- **Example idea:** Test whether NEAR Intents cross-chain volume leads network usage better than token price.
- **Process note:** Costs: user pays BigQuery query costs.

## 03 Privacy & Private AI (`privacy`)
- **Wants:** Private AI where sensitive data is never exposed; proof the analysis ran in a TEE.
- **NEAR tech:** NEAR AI Cloud (OpenAI-compatible API, TEE models), attestation verification.
- **URLs:** https://docs.near.ai/cloud/quickstart ; https://docs.near.ai/cloud/verification ; https://github.com/near-examples/nearai-cloud-verification-example ; https://docs.agentsonintents.com/integration/agent-api/overview ; base URL https://cloud-api.near.ai/v1
- **Judging hints:** Fresh random nonce on attestation; visible "Verified" panel listing checks; no server-side retention, stated in README and in code; fictional sample data so judges can run it.
- **Example idea:** Private expense auditor (categorize receipts/statements, flag anomalies, prove TEE execution).

## 04 Autonomous Business (`business`)
- **Wants:** Agent-run business: sells, buys its own inference, pays out revenue share; human sets rules only.
- **NEAR tech:** NEAR AI Cloud inference, NEAR Intents, Chain Signatures, OutLayer agent custody, scoped function-call keys.
- **URLs:** https://docs.near.org/ai/introduction ; https://app.outlayer.ai/docs/getting-started ; https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api ; https://docs.agentsonintents.com/integration/agent-api/overview ; https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator
- **Judging hints:** config.yaml rules (daily spend cap, min price, split %, kill switch); public ledger of sales/costs/payouts; no full-access key in plaintext; testnet demo loop under two minutes.
- **Example idea:** One-agent research shop selling market reports.

## 05 AI Swarms (`swarms`)
- **Wants:** Multi-agent coordination markets, sealed-bid group buying, intent-based settlement.
- **NEAR tech:** NEAR Intents, sub-accounts under one parent, coordinator contract, NEAR MCP server.
- **URLs:** https://docs.near-intents.org/getting-started/what-are-intents ; https://docs.near.org/getting-started/tools-for-ai ; https://github.com/nearai/near-mcp ; https://nearaccounts.com/ ; https://docs.agentsonintents.com/integration/agent-api/overview
- **Judging hints:** Each agent traceable via its own sub-account; RULES.md written before code; LLM-free simulation (20 buyers, 5 sellers); live round/bid/clearing page.
- **Example idea:** Group-buying swarm for GPU hours with sealed-bid rounds.

## 06 AI Security & Defense (`security`)
- **Wants:** Counterparty check service returning allow/warn/block before agent payments; scoped signing wrapper.
- **NEAR tech:** Function-call access keys scoped to one contract; NEAR AI Cloud attestation; OutLayer.
- **URLs:** https://docs.near.org/protocol/accounts-contracts/access-keys ; https://app.outlayer.ai/docs/getting-started ; https://docs.near.ai/cloud/verification ; https://docs.agentsonintents.com/integration/agent-api/policies-and-limits
- **Judging hints:** Explain key limits in README; prompt-injection attack demo with shown log; wrapper refuses on block, asks human on warn; scoring signals (account age, contract code changes, shared blocklist).
- **Example idea:** Counterparty check for agents that pay.
- **Caveat from prompt:** Function-call-only accounts cannot transfer NEAR or add keys and can lock themselves out if gas allowance runs out.

## 07 Agent Economy (`agents`)
- **Wants:** Agents that earn, spend, negotiate, hire agents, pay for APIs/compute/data.
- **NEAR tech:** NEAR AI Agent Market, NEAR MCP server, 1Click API, Agent API (demo base URL), PingPay x402 facilitator (USDC on Base to NEAR recipient).
- **URLs:** https://market.near.ai/jobs ; https://github.com/nearai/near-mcp ; https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api ; https://docs.agentsonintents.com/integration/agent-api/overview ; https://partners.demo.agentsonintents.com/dashboard ; https://api.demo.agentsonintents.com ; https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator
- **Judging hints:** Receipt per task (bought, from whom, price, passed check); one-counter negotiation; agent must verify whether Agent Market has a public programmatic posting path before building; demo keys are temporary and rotate.
- **Example idea:** General contractor agent with a task budget that hires/pays sub-agents.

## 08 Real-World Money (`realworld`)
- **Wants:** Invoicing, payroll, remittances, merchant rails usable by a normal company.
- **NEAR tech:** 1Click API, meta-transaction relayer (only pays for own-contract calls), NEP-141, PingPay x402.
- **URLs:** https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart ; https://docs.near.org/web3-apps/tutorials/meta-transactions ; https://github.com/near/NEPs/blob/master/neps/nep-0141.md ; https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator
- **Judging hints:** README written for a bookkeeper first; paid/pending/refunded statuses with transaction links; accountant-ready CSV export; one full paid-invoice flow on testnet before anything else.
- **Example idea:** Crypto invoicing for freelancers; they receive USDC on NEAR and never buy NEAR for gas.

## 09 Games With Real Economies (`games`)
- **Wants:** NPC merchant agents with wallets setting prices from stock and demand; player-owned markets.
- **NEAR tech:** NEP-245 multi-token (one contract for all items), social/email login, near-dapp agent skill, NEAR Intents.
- **URLs:** https://github.com/near/NEPs/blob/master/neps/nep-0245.md ; https://github.com/near/agent-skills/tree/main/skills/near-dapp ; https://docs.near-intents.org/getting-started/what-are-intents
- **Judging hints:** "Judges score the game loop, with a bonus if players never notice the chain." No seed phrases, wallet popups or gas prompts in normal play; merchant reasoning shown in tooltip; week-in-a-minute fast-forward.
- **Example idea:** Market-town game with NPC merchants whose prices react to supply.
- **Process note:** Requires designing the 30s / 5min / session loop on paper before code.

## 10 NFTs That Do Something (`nfts`)
- **Wants:** NFTs as accounts that hold money, earn royalties, carry access rights.
- **NEAR tech:** NEP-171, sub-accounts, Access keys, Top Level Accounts (rented name = NEP-171 NFT that is a real account; no SDK, build on contracts).
- **URLs:** https://github.com/near/NEPs/blob/master/neps/nep-0171.md ; https://docs.near.org/protocol/accounts-contracts/access-keys ; https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts ; https://github.com/houseofstake/tla-contracts ; https://github.com/houseofstake/tla-contracts/blob/main/docs/sharded-nft-items.md
- **Judging hints:** README must explain control transfer on sale and what stops the old owner keeping access; threat model written before code; tests for transfer including a sale mid-payout.
- **Example idea:** Membership NFT mapped to a sub-account holding treasury share and ticket-sale cut.

## 11 Memecoins With Mechanics (`memecoins`)
- **Wants:** Memecoins where the mechanic does something (reactive supply, rule-bound treasury, rituals).
- **NEAR tech:** NEP-141; meme.cooking launchpad (partner).
- **URLs:** https://github.com/near/NEPs/blob/master/neps/nep-0141.md ; https://meme.cooking/ ; https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts
- **Judging hints:** "Judges score the mechanic, and the price chart doesn't count." Mechanic lives in the contract, not a backend; parameters fixed at launch with no admin key; Sybil limits stated plainly in README.
- **Example idea:** Streak coin: daily check-in target mints to checkers on hit, burns treasury slice and resets on miss.
- **Process note:** Simulate 60 days of behavior before choosing parameters.

## 12 Social Money (`social`)
- **Wants:** Shared budgets, programmable rewards, reputation-gated access on Sputnik DAO / Trezu. Do not write a new multisig.
- **NEAR tech:** Sputnik DAO contract, Trezu, named accounts, near.social.
- **URLs:** https://github.com/near-daos/sputnik-dao-contract ; https://github.com/NEAR-DevHub/trezu-docs ; https://github.com/NEAR-DevHub/trezu ; https://near.social/ ; https://near.social/skill.md ; https://nearaccounts.com/ ; API check: https://api2.near.social/v1/tx/{tx_hash}
- **Judging hints:** Every reputation point traceable to a finished bounty; tiered approval (auto / one council member / full DAO proposal); public board.
- **Example idea:** Bounty board with earned trust for a DAO community.
- **Note:** near.social posts show as failed (CodeDoesNotExist) but data lands; verify via the API.

## 13 Open Innovation (`open`)
- **Wants:** Anything that fits no category. Can be entered alongside other tracks.
- **NEAR tech:** Chain Signatures, NEAR docs, HACKATHON.md.
- **URLs:** https://docs.near.org/chain-abstraction/chain-signatures/getting-started ; https://docs.near.org/ ; https://nearhackathon.com/HACKATHON.md
- **Judging hints:** Argue against your own idea in one paragraph first; README failure-case section (lost guardian keys, hostile guardian, owner alive but offline); timers shortened for testnet demo.
- **Example idea:** Inheritance account controlling BTC/ETH addresses via Chain Signatures, with check-ins, guardian release and cancelable waiting period.

## README and other repo files
- Files in repo: `00-setup.md`, `README.md`, `SUBMITTING.md`, and `tracks/01-defi.md` through `tracks/13-open.md`. Nothing else.
- README: paste `00-setup.md` once so the agent reads HACKATHON.md and installs NEAR agent skills. Submit checklist in `SUBMITTING.md`.
- Key dates (UTC): starts Nov 1 2026 00:00; development ends and submissions close Nov 14 2026 23:59; judging Nov 16 to 18 2026.
- Prizes: each track $10K / $3K / $2K; grand prize $55K; all paid in NEAR.
- Jury includes Claude Code and Codex as AI judges: write READMEs for a machine reader, with "do X, see Y" steps.
- Sources: https://nearhackathon.com/ ; https://discord.gg/nearprotocol
- Not fetched: `00-setup.md` and `SUBMITTING.md` (listed in the repo but out of scope for this task).
