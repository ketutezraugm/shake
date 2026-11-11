# Endgame: red-team, win assessment, endgame plan, readiness (Phases 9-12)

Written 2026-11-11. Short on purpose: the build matters more than this doc.

## Phase 9: Red-team

### As a skeptical judge
| Finding | Severity | Fix (applied to plan or docs) |
|---|---|---|
| "Is it just a sealed-bid double auction?" Yes, the mechanism is known. The novelty is making it usable by normal people with walletless accounts, a TEE instead of a trusted auctioneer, and binding escrow. | M | Say it first in the pitch and README; don't claim a new mechanism. Q&A covers it (PACKAGING.md 5). |
| "Real users" on testnet money can read as fake. | M | Frame honestly: real people, real items, real prices, testnet settlement. Log rounds used and time to deal, not money volume. |
| The agents track is weak unless the AI negotiator ships, and it's cut item #4. | M | Default tracks: **privacy + realworld**. Switch to agents only if S-02 ships by the freeze. |
| Browser-held full-access keys: Mert Mumtaz will notice. | L | Testnet only; key never leaves the browser; README states it and offers export. |
| Ciphertexts are public forever; a future TEE key leak exposes old limits. | L | State in README; limits are only useful during the deal anyway. |
| OutLayer is a centrally operated network. | M | Already stated in README per DECISIONS; the trust panel says so in one line. |

### As a skeptical senior engineer
| Finding | Severity | Fix |
|---|---|---|
| **AI screening can't run `demo:seed` without our relayer key.** A cloned repo must work without secrets. | **H** | README path uses the **hosted relayer and the deployed contract** by default; `.env.example` ships those public values; `npm run dev` works with no secrets. Added to P-01's done-check. |
| OutLayer is the single point of failure on the critical path. | H | Spike first (D1-08); gate G1 at end of 11-11; fallback matcher ready. Unchanged. |
| Relayer must fund accounts with gas plus escrow (a Rp 4.2M deal = 0.42 test NEAR). Faucet limits could starve demos. | M | Collect testnet NEAR today; fund buyers on demand up to a cap; demo deals use small prices. Faucet limits are **unverified** (official faucet page gone; third-party claims conflict), so the test rate is now Rp 100M per NEAR (a 4.2M deal escrows 0.042 NEAR). Backend verifies the real faucet output on day 1 and records it in ASSUMPTIONS.md. |
| Abel may change the identity, so Frontend could build against moving tokens. | M | **Token freeze 11-12 12:00 UTC.** After that, only copy and asset swaps. |
| Two identities in one browser for the split-screen demo. | M | The demo page keeps two keys under separate localStorage namespaces; spec'd in D1-10/M1-11. |
| The OutLayer fee is paid by the second submitter: walletless accounts need enough balance. | L | Relayer funding covers it; amount set after the spike. |
| Product name still open: it blocks the parent account, README, X post and logo. | H | **Pick the name today.** Candidates: Kode Jari, Harga Pas, Sarung (clear); Marosok (unchecked). |

### Contradictions found
- IDEAS.md early text says the AI runs the comparison in a TEE on NEAR AI Cloud; the final design uses OutLayer for matching and NEAR AI only for parsing. DECISIONS.md is authoritative; IDEAS.md is history.
- PACKAGING.md tracks say "agents-or-realworld"; the default is now privacy + realworld (above).

### Over- and under-building
- **Cut now:** Bahasa toggle (keep a few Bahasa words in copy), receipt page (link to explorer instead).
- **Under-built and demo-critical:** the waiting state during OutLayer execution (tens of seconds) needs real design and progress; the reset button for the live demo.

### Mock judging (3 lines each)
| Judge | Likely view | Biggest criticism |
|---|---|---|
| Illia Polosukhin | Likes private computation for everyday users; NEAR-native (OutLayer, accounts) | "Why not NEAR AI's TEE?": answer: custom code needs OutLayer |
| Eddy Lazzarin | Mechanism-design fluent; will see the double auction | "Known mechanism": answer with usability and trust model |
| Mert Mumtaz | Checks key handling and admin keys | Browser full-access keys |
| Avichal Garg | Liability and binding agreements | "What if the buyer never pays?": expire after 24 h, no bond |
| Kain Warwick | UX focus; will like walletless | Testnet money |
| Haseeb Qureshi | Anti-hype; likes AI out of the money path | Probing and laddering: Q&A ready |
| Stepan Gershuni | Little known | — |
| Claude Code & Codex | Reproducibility | Fixed above (hosted defaults) |

**Re-score (rubric, 1-5):** technical 4, design 4 (depends on Abel's output), impact 3, originality 4, sustainability 2. **Weakest: sustainability.** Raise it with one paragraph and one screen-free line: a 0.5% fee on settled deals, and marketplaces (Facebook groups, OLX-style) embedding the link. Added to PACKAGING Q&A as a TODO.

## Phase 10: Win assessment (honest)
Field: privacy has 68 entries on 11-09, likely ~120 at the deadline, with Penstock as the strongest.

| Prize | Probability | Why |
|---|---|---|
| Privacy track podium (top 3) | 25-35% | Only negotiation entry; real TEE use; strong packaging possible. Risk: OutLayer slips, or execution runs late |
| Privacy track 1st | 10-15% | Penstock and others are a week ahead on polish |
| Realworld podium | 10-15% | Bigger, crowded field (78+) |
| Grand prize | 2-4% | Needs flawless execution plus real usage |

**Top 5 levers (all recommended):**
1. **M1 working end to end by 11-12 noon.** Everything else multiplies this. Cost: focus.
2. **10+ real deals with students, logged.** No top competitor has users. Cost: half a day of recruiting.
3. **Reproducible README with hosted defaults.** Passes the AI screen. Cost: 2 h.
4. **A 2-minute video where the reveal lands in 20 s.** Cost: half a day of Abel's time.
5. **Name and visual polish on the reveal moment.** Cost: Abel + Frontend, half a day.

**Human-only actions (you or teammates):**
- Ask in NEAR Discord/Telegram: can one project win more than one track? Is there a NEAR AI credit for hackathon teams?
- Ask in OutLayer's channel: testnet worker availability and fees (before the spike, today).
- Recruit 15-20 students for 11-12/13 deals; get consent for quotes.
- Pick the product name today.
- Assign the 4 roles today; add collaborators to the repo.

## Phase 11: Endgame plan
- **Token freeze:** 11-12 12:00 UTC. **Feature freeze:** 11-13 12:00 UTC; after that only fixes, polish, packaging.
- **Competitor re-scan:** one scheduled Sonnet agent at 11-13 06:00 UTC, reporting only changes since COMPETITORS.md (new privacy or negotiation entries). Rule: a finding changes the plan only if a near-identical product appears; otherwise it changes the pitch's comparison line only.
- **Submission checklist (11-14):** repo public; LICENSE (MIT); README with "do X, see Y", hosted URL, libraries and baseline disclosure, OutLayer centralisation and Myerson-Satterthwaite limits; hosted demo up until 11-25; X post live with video, "built at NEAR HACKATHON", @NEARProtocol, #NEARHackathon; payload printed and confirmed by the whole team; `website` field empty; `requestId` generated once and kept; tracks `privacy` + `realworld` (or `agents`); NEAR mainnet payout account created by the team.
- **Rehearsal:** 3 timed video takes on 11-13 afternoon; pick the best by 11-13 evening.
- **Backups:** recorded video, screenshots of each screen, a local build that runs against testnet.
- **Final cleanup (11-14 morning):** tidy root, remove scaffolding, check no secrets (`git log -p | grep -i key` sweep), README pass, humanizer on README and write-up.

## Phase 12: Readiness check
| Item | Status |
|---|---|
| Rules checked, no disqualification risk left | ✅ (RECON.md) |
| PRD, architecture, plan, team, design brief approved and consistent | ✅ (contradictions above resolved) |
| Accounts and keys: NEAR testnet parent account, relayer key, OutLayer payment key, Render account, NEAR AI key (Should) | ❌ not created: Backend + Contracts roles, today |
| Repo created, teammates added | ⚠️ repo yes (private); collaborators not added |
| Branch protection | ⚠️ unavailable on a free private repo; team habit until public |
| CI green on empty scaffold, hello-world deploy | ❌ D1-01..03 |
| CLAUDE.md, HANDOFF.md, TEAM.md, memory entry | ✅ |
| `.claude/settings.json` attribution off | ✅ |
| Claude Design: design system ready; Abel's screens | ⚠️ system ready; screens in progress |
| Asset inventory, motion, interaction, polish checklist; no icon/animation libraries in the plan | ✅ (DESIGN-BRIEF.md) |
| Task board | ⚠️ PROGRESS.md checklist instead of GitHub Issues (faster for 4 days) |
| Demo slice defined, target date | ✅ M1, 11-11 EOD, hard 11-12 noon |

**Blocking the build right now:** role assignment, collaborators, product name. Everything else is a day-1 task.
