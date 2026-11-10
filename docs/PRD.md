# PRD: Blind deal (working title)

Deadline 2026-11-14T23:59Z. Submit by 12:00 UTC 11-14. Decisions come from BUILD-BRIEF.md; this file does not change them.

## Problem
Haggling punishes whoever names a number first. A seller asks 5M, the buyer would have paid 5.5M, and neither learns it. People walk away from deals both wanted because neither will show a limit.

## Users
- Seller: a student selling a used item in a campus chat group.
- Buyer: a student who got a single-use link from that seller.
- Judge / AI screener: clones the repo, follows the README, opens the hosted demo.

## User stories
1. As a seller, I create a deal and send one link, so I do not have to quote a price first.
2. As a buyer, I open the link and enter a maximum, with no wallet or seed phrase.
3. As either side, I see "no deal" and nothing else when ranges do not overlap.
4. As a buyer, I pay into escrow and get a refund if the item never arrives.
5. As a seller, I get paid when the buyer confirms "Received".
6. As a judge, I run a seeded demo without two devices.

## Magic moment
Both phones show the same reveal at the same time: "Deal at Rp X", or "No deal", with no other number shown.

## Scope (from brief)
**Must (M1 = end 11-11, hard stop noon 11-12):**
1. Seller creates deal (title, description), gets single-use buyer link.
2. Walletless accounts: browser ed25519 key; relayer creates `name.<app>.testnet` and funds it.
3. Each side enters a numeric limit, encrypted in the browser to the TEE key; contract stores ciphertext + commitment hash.
4. When both are in, contract calls OutLayer; WASM compares, picks a random price in [seller_min, buyer_max], returns `{matched, price}`; callback stores it.
5. Reveal screen on both phones (poll contract view).
6. Escrow: buyer deposits price; "Received" releases; refund after deadline; no admin key.
7. One attempt per buyer link; deals binding.
8. Hosted demo + README with a seeded demo pair.

**Should (11-12..13):** AI negotiator (NEAR AI Cloud, E2EE + attestation); "Verified" attestation panel with fresh nonce; receipt page with tx links; Bahasa/English; 10-20 real deals logged.
**Could:** pay from another chain via 1Click; dispute flow; connect existing wallet; item photo.
**Won't:** mainnet, real money, native app, account recovery beyond "export key".

## Feature specs and acceptance criteria (Must)
| # | Acceptance criteria (each is testable) |
|---|---|
| 1 | `create_deal` returns a deal id; the link contains a one-time token; opening it a second time after use shows "link used". |
| 2 | From a fresh browser, no wallet installed, an account exists on testnet within 15 s and holds funds; relayer returns 429 after the per-IP limit; the secret key is never sent to the relayer. |
| 3 | The contract view `get_deal` shows ciphertext and commitment but no plaintext; commitment equals `sha256(limit, salt)` when the owner reveals it in a test. |
| 4 | Test cases: seller_min <= buyer_max gives `matched=true` and price within [min, max]; otherwise `matched=false`, price absent. Unit tests in `tee/` run offline. On-chain: a callback from any account other than `outlayer.testnet` is rejected. |
| 5 | Both clients show the same state within 5 s of the callback; reveal shows only price or "no deal". |
| 6 | Deposit of exactly `price` moves state to FUNDED; `confirm_received` by the buyer pays the seller; `refund` after deadline pays the buyer; every wrong caller or state call panics; no owner-only method exists. |
| 7 | A second `submit_limit` from the buyer on the same deal fails; a deal in MATCHED cannot be cancelled by either side. |
| 8 | A fresh clone plus README steps ends at the hosted demo; `npm run demo:seed` creates a matched deal and an unmatched deal. |

## Success criteria (rubric, equal weights)
- Gate, reproducible: README "do X, see Y" passes on a clean machine; hosted demo up until 11-25.
- Technical: Rust contract with tests; sub-accounts, TEE via OutLayer, cross-contract callback; commitments on-chain.
- Design: IDENTITY.md applied; chain invisible (no gas, no seed prompt); reveal as the signature moment.
- Impact: 10-20 real deals logged; metric "deals that would have failed to start".
- Originality: only negotiation entry (per IDEAS.md claim of 373 entries; not re-checked here).
- Sustainability: UNVERIFIED path; candidate is a small fee on escrowed deals. State it as a hypothesis in the README.

## Track sections
**Privacy (primary).** Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret (the private-dao-example pattern). The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned, and returns only `{matched, price}`. The relayer never sees plaintext and keeps no deal data. Should: a "Verified" panel with a fresh nonce showing the WASM hash and the NEAR AI attestation. Stated limits: OutLayer governance is still centralised; the match bit and price leak some information; users trust the served frontend.
**Agents (only if the AI negotiator ships).** NEAR AI Cloud turns "not below 4M, charger included" into numbers via E2EE chat completions, with the model key taken from an attestation report. The LLM never touches money: a deterministic rule in the WASM decides. If it does not ship, tag `realworld` (README readable by a non-technical user, paid/pending/refunded states, tx links).

## Risk register
| Risk | Likelihood | Impact | Mitigation | Fallback |
|---|---|---|---|---|
| OutLayer unknowns (ECIES with PROTECTED_ secrets, testnet workers, fees) | M | H | 2-3 h spike on 11-10 using random-example | Matching service with a signing key registered in the contract; then commit-reveal (decide by end 11-11) |
| Browser-held keys lost or stolen | M | M | "Export key" screen; testnet only | Re-create the deal |
| Relayer abuse (account farming) | M | M | Per-IP rate limit; small funding; cap total spend | Disable creation, use seeded accounts |
| Testnet faucet dry | M | H | Fund the relayer early; keep a reserve | Fewer demo accounts, reuse |
| Two-sided demo needs two devices | H | M | Seeded demo pair; split-screen page | Recorded video |
| Strategic misreporting (Myerson-Satterthwaite) | H | L | Binding deals; state the limit in README | None needed |
| OutLayer centralisation | H | M | State it in README and pitch | None |
| Time (4 days) | H | H | Freeze 11-13 12:00 UTC; Should items cut first | Ship M1 only |

## Milestones
- 11-10: identity locked; docs; repo, CI, Render hello-world; OutLayer and relayer spikes.
- 11-11: contract + WASM end-to-end on testnet; frontend on mocks, then wired. M1 EOD.
- 11-12: escrow polish, attestation panel, AI negotiator, hosted; start real deals.
- 11-13: feature freeze 12:00 UTC; real deals, video, README, X post draft.
- 11-14: repo public, X post live, submit by 12:00 UTC.

## Open questions
Resolved 2026-11-10 in DECISIONS.md: result trust (callback path Must, enclave signature Should), units (Rupiah in, fixed demo rate to testnet NEAR), randomness (TEE), account naming (parent account once the name is final), NEAR AI key (relayer proxy, E2EE prompts).
Still open:
1. Seller can re-post the same item as a new deal with a different minimum. Accepted: each buyer still gets one attempt, and the seller learns only "deal / no deal" from a buyer who joins.
2. NEAR AI Cloud credit: $5 coupon seen, $10 UNVERIFIED; ask organizers if the AI negotiator ships.
