# Competitors: NEAR HACKATHON 2026

**Snapshot: 2026-11-09.** Re-scan planned in Phase 11 (midpoint is already past; do one re-scan on 11-13).

## Sources checked
- Public gallery via `https://nearhackathon.com/api/projects?page=N`: all 373 entries (raw/gallery.json). Gallery gives name, tracks, X demo link; no repo links.
- `gh search repos` / `gh search code` for NEARHackathon, NEAR hackathon, near intents, near-sdk, chain signatures, created ≥ 2026-10-19: 300 repos, 138 gallery projects matched to 97 repos (raw/competitor-list.md, top 60 scored).
- READMEs, trees, commit cadence and live sites for 8 deep profiles (raw/competitor-profiles-a.md, -b.md).
- Not checked: Discord, Telegram, X timelines (need login / human).

## Top 8 profiles (summary; detail in raw/)

| Project | Tracks | What it is | NEAR depth | Threat | How to beat it |
|---|---|---|---|---|---|
| Warrant | defi | Fully collateralised options; collateral locked in intents.near until expiry, options as NEP-245 | Locked, source-verified **mainnet** contract; deepest Intents use | HIGH | Different category, or real counterparties + fee story (it has zero market activity) |
| Penstock | privacy, realworld | x402 paywall for APIs/MCP; agents pay from any chain, seller gets USDC | Real mainnet Intents payment + refund; no own contract | HIGH | On-chain component + hosted non-simulated flow |
| TokenGo | games | Location game; loot = NEP-245 compute shards → NEAR AI credits; chain hidden | NEP-245 contract, 292 tests, live server | HIGH (games) | Fun in 30 s, less to read, real-money loop |
| $BEFEWER | memecoins, games | No-premine coin mined by winning a sealed-bid minority game (drand timelock); fees → buyback-burn | Rust contract (83 tests), Ref pool, testnet | HIGH (memecoins) | Mainnet + real players; simpler onboarding; derivative of ORE |
| Writ | security, agents, open, realworld, nfts | Guarantor bond + arbiter for when an agent gets fooled | 126-attack bench, fuzzing, `make verify`; testnet | HIGH tech / MED overall | Simpler story, real users, visual design |
| nearbi | thesis, business | Autonomous agent selling NEAR research reports ($29–$499) | Mainnet contracts, 1Click checkout, one real sale | MED-HIGH | Keyless reproducible demo; product-grade UI |
| Petty Cash | realworld, social | Sputnik DAO budget rules: small spends auto, large to council | Rust contract (24 tests) integrated with Sputnik; testnet | MED-HIGH (social) | Mainnet DAO, real wallet onboarding; it stalled after 11-02 |
| NEAR Books | thesis, open | Re-runnable NEAR tokenomics audit + TEE-attested daily record | Mainnet attested contract; 17/17 offline checks | MED | Live, decision-useful dashboard; it stalled after 10-21 |

## Competitive map

| Cluster | Size (11-09) | Strength | Verdict |
|---|---|---|---|
| Agent spending guards / firewalls / limits / vaults | ~72 names, security 182 + agents 179 tags | Many solid, all alike | **Avoid.** Even a great one drowns. |
| Invoices / payroll / x402 paywalls | ~22 names, realworld 78 | Penstock strong | Crowded at the top |
| Intents DeFi (options, lending, OTC, swaps) | defi 62 | Warrant, setllend strong; mainnet needed | Hard + strong leaders |
| Thesis dashboards | thesis 33 | nearbi, NEAR Books, near-thesis, NearQuery | Small but has 4 credible entries |
| Swarms / multi-agent markets | swarms 32 | Mostly "agent OS" claims | Under-contested, but judges tired of agent marketplaces |
| Games | games 28 | TokenGo high, median thin | **White space for a fun, polished game** |
| NFTs with behavior | nfts 29 | Scattered (passes, deeds, NPC NFTs) | **White space** |
| Social / DAO tooling | social 28 | Petty Cash best, stalled | **White space** |
| Memecoin mechanics | memecoins 20 | $BEFEWER high; rest thin | Least contested; one strong leader |

## Implications

1. **Avoid** agent guards/firewalls/limits, generic agent marketplaces, chat-to-swap, invoices/paywalls.
2. **Nobody has real users.** Across all 8 deep profiles and the 10-repo field sample, no one is on mainnet with real users or volume. A product 20+ real people used during the hackathon, with on-chain evidence, beats every top profile on Impact. This is our clearest opening and the one thing a 4-person team can do better than a solo sprinter.
3. **Under-contested tracks with a weak median:** games, nfts, social, memecoins (20-29 entries each). A project that honestly fits 2-3 of them (e.g., a game whose items are NFTs with behavior, played in groups) stacks prizes without tag spam.
4. **Design is a gap.** Most entries are solo-built, README-heavy and plainly styled; several READMEs read as AI bulk. With a dedicated designer we can be the best-packaged entry in any small track.
5. **Head start problem.** Top competitors started 10-20..11-05 and have 40-370 commits. We have ~5 days. Pick a scope where a narrow, polished loop is the whole point (games, social rituals), not depth-of-protocol (DeFi, security benches).
6. **What "polished" looks like here:** live hosted demo, `make demo` / one-command repro, tests count stated in README, contract on testnet (mainnet for the top tier), "do X, see Y" README steps, X video of one complete moment.


## Re-scan: 2026-11-13 (marketplace pivot)

**Sources:** the public gallery API (`/api/projects?page=1..100`, 783 entries; names, tracks and X links only), NEAR Hunt (`nearhunt.xyz`, project pages with descriptions), `gh search repos` for repos created since 10-19 (the index is thin: it found one relevant repo), and web search. Not checked: X timelines, Discord, Telegram.

**The field doubled.** 373 entries on 11-09, 783 now (410 new). Our tracks grew with it: privacy 68 to 156, realworld 78 to 184, agents 179 to 335, social 28 to 83. The "under-contested" tracks in the first scan are no longer thin.

**Nobody else sells second-hand goods with a sealed floor.** Name and description checks across all 783 entries found no marketplace where a seller's minimum and a buyer's maximum are both hidden and a deal lands at a price inside the overlap. The nearest entries:

| Project | Tracks | What it is | Overlap with us |
|---|---|---|---|
| NEAR Private OTC | defi | Finds OTC counterparties on NEAR Intents; repo `Watchmeecryt/near-private-otc` | Same problem family, but the page explains no privacy mechanism and shows no usage; DeFi traders, not goods |
| StreetMarket AI (GhostTech) | business, swarms, agents, realworld | AI storefronts bid on jobs; a contract stops a shop bidding below its floor; one on-chain USDC job and NEAR escrow demo | A floor, but it is enforced publicly on agent jobs, not sealed between two people |
| VeilProcure | privacy | Deadline-sealed bids, testnet escrow, attested AI evaluation for procurement | One-sided sealed bids for institutions; same stack ideas (sealed, escrow, TEE) |
| SealedChoice | privacy, security, realworld | Tender bids that cannot leak or change | One-sided tenders; no negotiation |
| Blindsight | privacy, business | Pay to query sealed datasets, answers from a NEAR AI enclave | Different product; same "private AI" angle |
| Sealwell | privacy, defi | Sealed-bid batch auctions for NEAR Intents, MPC unlock; shielded pool live on testnet | Strong privacy build, but token auctions |
| Ashes of the Ninth Heaven, Nims, Emporium, Taskbond | agents, games, swarms | Agent merchants and shops, some "haggle" | Agents trading with agents, no human second-hand sellers |

**"Sealed" is a crowded word.** About 20 entries have sealed, blind, veil, private or confidential in the name (Sealed Exploit, Sealed Dossier, Sealed Ledger, SealedBounty, SealedSwarm, BlindBench, Veil, VeilProof and others), plus sealed-bid projects without it (BEFEWER, Assay, Hivebuy, HiveBid, Sealwell). Judges will see the vocabulary many times.

**What this changes in the pitch.**
1. Lead with the people and the item, not the mechanism: a student sells a camera, the buyer never learns the floor, the seller never learns the buyer's maximum, and they still get one fair price. Say "both sides hidden", which the sealed-bid projects are not (theirs are one-sided).
2. Say the mechanism is a known one (sealed-bid double auction) and that the new part is making it usable by normal people with escrow and walletless accounts (already in ENDGAME.md).
3. Real second-hand listings by real sellers (S-08) is the differentiator no other entry can claim; the gallery shows no marketplace with real users.
4. The field's median entry is README-heavy and unstyled; Abel's frames and the restyle are an advantage only if the demo is hosted and clickable (S-06, MK-40).
5. Track choice: privacy (156 entries) is now crowded; realworld (184) is larger still. Keep the proposed list, but weight the video toward the realworld story and use privacy for the sealed-limits proof.
