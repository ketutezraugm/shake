# Recon: NEAR HACKATHON 2026

Snapshot 2026-11-09. Sources: HACKATHON.md (organizer, in repo root), nearhackathon.com site text, raw files in `raw/`.

## 1. Rules digest

| Rule | Detail | Source |
|---|---|---|
| Deadline | 2026-11-14T23:59Z, hard. API answers 403 outside window. | HACKATHON.md Facts |
| Eligibility | Anyone; solo or team; no sign-up, submission is registration. | site FAQ |
| Team limits | One submission per project. A person may be on at most 2 independent projects, each README naming the other. | Q-015 |
| Pre-existing code | Allowed from 2026-10-19 (announcement). Older code = baseline, disclose. Existing product on another chain OK, only NEAR integration judged. | Q-001..Q-004 |
| Libraries / AI code | Allowed; list in README. | Q-005 |
| Required tech | None mandatory. Own NEAR contract fitting the track is enough. | Q-011 |
| Network | Testnet eligible in all tracks. NEAR Intents has no testnet: mainnet, tiny amounts, `dry: true` quotes. | Q-007, Q-010 |
| Submission | Public repo + public X post (says built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon, video or screenshots). Form or POST /api/applications. | HACKATHON.md Procedure |
| Demo | Local-only OK only with a video; screenshots alone insufficient if judges can't open the demo. Hosted demo is a plus; keep it up to 11-18, ideally 11-25. | Q-012 |
| Video length | Not specified by organizers. X non-Premium upload cap applies (unverified, ~2:20). | ASSUMPTIONS.md |
| Deck | Not required. | site |
| IP | Team keeps all rights; organizers get non-exclusive promo rights. Any license; add LICENSE. | Q-013, Q-014 |
| Screening | Claude Code + Codex check it runs and does what the README says, produce a preliminary score. Humans decide. | Q-017 |

**Disqualification / loss risks**
1. Repo not public by the deadline, or X post missing the tags or the "built at NEAR HACKATHON" line.
2. Submitting twice (409) or a second repo link counting as another project. One attempt; mistakes go through request-changes.
3. Non-empty `website` field in the API payload (spam trap).
4. A hosted demo that is down during 11-16..18; README steps that don't reproduce (fails AI screening).
5. Reusing pre-10-19 code without disclosure.
6. Committing secrets or the submission payload (personal data).
7. Any team member also on a second project without cross-naming in both READMEs.

## 2. Judging rubric (self-grading)

Organizers publish no weights. They point at past NEAR criteria: technical implementation, design, impact, originality, sustainability. We weight them equally and add a pass/fail gate.

| # | Criterion | Weight | What a 5/5 looks like |
|---|---|---|---|
| 0 | **Gate: reproducible** | pass/fail | Fresh clone + README "do X, see Y" works for an AI screener in minutes; hosted demo up. |
| 1 | Technical implementation | 20% | Real NEAR contract(s) with tests, deep (not token) use of NEAR-specific features: sub-accounts, function-call keys, chain signatures, Intents, TEE. |
| 2 | Design | 20% | Distinctive, coherent product and package; the chain is invisible where it should be. |
| 3 | Impact | 20% | Clear user with a real problem; someone could use it tomorrow; real users tried it. |
| 4 | Originality | 20% | Not in the guard/firewall cluster; judges haven't seen it 50 times this week. |
| 5 | Sustainability | 20% | Plausible path past the hackathon: revenue, protocol fee, community, open standard. |

Track-specific hints the organizers state outright (raw/track-prompts.md) act as bonus checks:
- **games:** scored on the game loop; bonus if players never notice the chain (no seed phrases, popups, gas prompts).
- **memecoins:** scored on the mechanic, not the chart; mechanic in the contract, params fixed at launch, no admin key, Sybil limits in README.
- **thesis:** reproducible evidence, one command rebuilds charts, counter-evidence section, no invented numbers.
- **security:** README key limits, prompt-injection attack demo, refuse-on-block / ask-on-warn.
- **social:** every reputation point traceable; tiered approval; public board.
- **nfts:** threat model first; control transfer on sale; tests for sale mid-payout.
- **swarms:** sub-account per agent; RULES.md before code; LLM-free simulation; live clearing page.
- **realworld:** README for a bookkeeper; paid/pending/refunded with tx links; CSV export.
- **privacy:** fresh attestation nonce; visible "Verified" panel; no server retention.
- **business:** config.yaml rules + public ledger; no full-access key; testnet loop under 2 min.
- **agents:** receipt per task; one-counter negotiation.
- **defi:** dry-run with real quotes; REFUNDED/FAILED states shown.
- **open:** argue against your own idea first; failure-case section.

## 3. Prize map

$250k total. Grand prize $55k (one). Each of 13 tracks: $10k / $3k / $2k. Pick every track the project fits; still one submission. **Whether one project can win in several tracks, or grand + track, is unverified**: ask in Discord/Telegram.

Gallery counts are public submissions on 11-09 (373 total); expect roughly double by the deadline.

| Track | Entries 11-09 | Single-track entries | Qualify difficulty | Read |
|---|---|---|---|---|
| security | 182 | 32 | low | Saturated: guard/firewall/limit names ~72 |
| agents | 179 | 7 | low | Saturated, mostly co-tagged with security |
| realworld | 78 | 13 | medium | Crowded with invoice/payroll |
| privacy | 68 | 6 | medium-high (TEE) | Moderate |
| business | 67 | 1 | medium | Mostly guard projects tagging along |
| open | 66 | 8 | low | Catch-all |
| defi | 62 | 9 | high (mainnet Intents) | Moderate, some strong builds |
| thesis | 33 | 18 | medium (data work) | Small, focused field |
| swarms | 32 | n/a | medium | Under-contested |
| nfts | 29 | 8 | medium | Under-contested |
| games | 28 | 7 | high (fun is hard) | Under-contested, quality TBD |
| social | 28 | 5 | medium (Sputnik) | Under-contested |
| memecoins | 20 | 5 | medium | Least contested |

Stacking: most projects tag 2-5 tracks. Honest stacking means a project that is a real game *and* a real NFT/memecoin mechanic, not tag spam.

## 4. Judges

Names are confirmed by the site. Profiles: raw/judges-past-winners.md.

| Judge | Cares about | Likely allergic to |
|---|---|---|
| Illia Polosukhin (NEAR) | User-owned AI, privacy/TEE, agents acting for a user | Agents that are "still useless": insecure, no private execution |
| Eddy Lazzarin (a16z crypto) | Agent identity, payments rails, chain as plumbing | Unclear; firm-level views only |
| Mert Mumtaz (Helius) | Engineering rigor, safety, formal verification, no admin-key comfort | Fragile code, admin keys |
| Avichal Garg (Electric Capital) | Agents with wallets as a new legal/economic primitive; liability | Ignoring who pays when agents fail |
| Kain Warwick (Synthetix/Infinex) | Crypto UX, DeFi security | Bad UX needing crypto-native users |
| Haseeb Qureshi (Dragonfly) | Measured reliability, real adoption | Viral demo-ware, agent tokens, hype timelines |
| Stepan Gershuni (cyber.Fund) | Collective ownership of AI, "cybernetic economy" | Little public material |
| Claude Code & Codex | Repo runs, README matches behavior | Unreproducible setup, marketing READMEs |

Panel-wide: security and reliability first, privacy second, anti-hype throughout. A fun or useful product with a hard-to-fake mechanic beats another agent wallet.

## 5. Past winners

Detail is thin (raw/judges-past-winners.md). Patterns:
- A real payment rail in the demo, not a mock.
- A narrow concrete job with a number, over a general "agent platform".
- Novel primitive / non-obvious angle can take the grand prize (Unruggable, CrowdBrain).
- Privacy/TEE gets explicit recognition at NEAR events.
- Live demo + public repo.

Recurring ideas judges are tired of: chat-to-swap agents, yield optimizers, agent tokens/launchpads, agent marketplaces with no real counterparties, wallet-for-agent wrappers, thin Intents swap UIs. **Add from this field:** agent spending firewalls/guards/limits (~72 of 373 names).

## 6. Sponsor tech (verified 2026-11-09)

Full detail and sources: raw/sponsor-tech.md.

| Tech | Testnet | Cost | SDK / version | Setup | Gotchas |
|---|---|---|---|---|---|
| NEAR Intents / 1Click | No | API free; +0.25% fee without JWT | one-click-sdk-typescript 0.1.26; base 1click.chaindefuser.com/v0 | 2-3 h | Real funds; `dry:true` for demo |
| Chain Signatures | Yes `v1.signer-prod.testnet` (mainnet `v1.signer`) | gas/deposit | chainsig.js 1.1.16 | 3-5 h | Target chain needs gas + RPC |
| NEAR AI Cloud | hosted | paid; $5 coupon seen ($10 unverified) | OpenAI-compatible, cloud-api.near.ai/v1 | 1 h | Which models run in TEE unverified |
| Contracts | Yes | free | near-sdk-rs 5.30.1, near-cli-rs 0.31.1 | 2-4 h | **near-sdk-js archived → Rust**; faucet may be dry |
| JS client | Yes | free | near-api-js 7.4.0 / near-kit 0.20.2 | 1-2 h | `@near-js/*` stale |
| Function-call keys / meta-tx | Yes | relayer pays gas | near-api-js | 2-4 h | One receiver, no deposit; meta-tx ignores allowance |
| Login | Yes | free | @hot-labs/near-connect 0.12.0 (canonical unverified), Privy plugin | 2 h | NEAR Auth mainnet needs approval |
| OutLayer | Yes `outlayer.testnet` | trial key | HTTPS API, WASI | 3-6 h | Use `api.` host |
| Sputnik DAO v2 | Yes `sputnikv2.testnet` | free | sputnik-dao-contract 3.0.0 | 2-3 h | Factory interface unconfirmed |
| Agent Market, Trezu, meme.cooking, Rhea | unverified | unknown | thin/no dev docs | — | Avoid as core dependency |
| NEP-141 / 171 / 245 | Yes | free | near-contract-standards (Rust) | — | NEP-245 Final |

Implication: a Rust contract on testnet plus a TS frontend is the safe core. Intents only as dry quotes or a tiny mainnet hop. Don't build on sponsors without dev docs.
