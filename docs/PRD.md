# PRD: Blind deal (working title)

Deadline 2026-11-14T23:59Z (hard wall, buffer only). Feature freeze 2026-11-14 00:00 UTC. Submit by 12:00 UTC 11-14. Decisions come from BUILD-BRIEF.md and, for the marketplace pivot, docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md; this file does not change them.

## Problem
Haggling punishes whoever names a number first. A seller asks 5M, the buyer would have paid 5.5M, and neither learns it. People walk away from deals both wanted because neither will show a limit.
Second-hand sellers already have an audience: they put a link in their Instagram or marketplace bio. But every sale there starts in a DM where the first number named loses. A listing with a public price starts the same fight.

## Users
- Seller: a person who sells used items and has a bio link (Instagram or a marketplace profile). Lists once, can be offline while buyers make offers.
- Buyer: someone who taps that bio link, lands on the seller's shop at `/@handle`, and wants an item without opening a haggle.
- Judge / AI screener: clones the repo, follows the README, opens the hosted demo and the seeded shop `@demo`.

## User stories
1. As a seller, I put one profile link in my bio, so buyers arrive at my shop and I do not quote a price in a DM.
2. As a seller, I list an item with photos and a sealed minimum, so no listing shows a price.
3. As a buyer, I sign in with Google or an email link, with no wallet or seed phrase.
4. As a buyer, I browse and search open listings and ask the assistant about an item without talking to the seller.
5. As a buyer, I ask the seller a question when the assistant does not know, and see the answer on the listing.
6. As a buyer, I enter a blind maximum, and as either side I see "no deal" and nothing else when the ranges do not overlap.
7. As a buyer, I pay into escrow and get a refund if the item never arrives.
8. As a seller, I get paid when the buyer confirms "Received".
9. As both sides of a deal, we chat once the deal matches, and not before.
10. As a judge, I open a seeded demo shop without two devices.

## Magic moment
A buyer taps the bio link and lands in the seller's shop, not on a price tag. Later both phones show the same reveal at the same time: "Deal at Rp X", or "No deal", with no other number shown.

## Scope (from the design doc)
**Must (by the freeze, 2026-11-14 00:00 UTC):**
1. Sign-in (Google or email link) creates a profile and, behind it, `handle.<parent>.testnet` funded by the relayer.
2. Seller profile at `/@handle`: avatar, display name, bio, city, active listings, sold count. This is the bio link.
3. Create listing: title, description, up to 5 photos, category, condition, city, rounds (1-3), sealed minimum. No price field shown publicly.
4. Public browse: home grid of open listings, text search, category filter.
5. Listing page: photos, details, seller card, "Blind offer" badge, offers-used counter, AI assistant, public Q&A.
6. AI product assistant (NEAR AI Cloud via the relayer): answers from the listing and its public Q&A only; when unsure it says so and offers "Ask the seller".
7. Public Q&A: signed-in buyers ask; only the seller answers; answered questions show on the listing.
8. Blind offer: buyer enters a maximum (encrypted in the browser to the TEE key), up to the listing's rounds, raising only. Reveal shows "Deal at Rp X" or "No deal".
9. On a match the listing becomes Reserved; buyer pays into escrow; "Received" releases to the seller and the listing becomes Sold. Expiry or refund reopens it.
10. Chat per deal, opened at Matched, between the two parties only.
11. Seeded demo shop with several listings (team's own photos of real items) and a seeded matched deal.

Seller notifications are in-app only in the Must build: an inbox and badge for new questions, matches and payments, fed by Supabase Realtime.

**Should:** AI negotiator (natural-language limit), Verified attestation panel, seller ratings after Sold, saved items, seller lowers the minimum on a live listing, E2EE prompts to NEAR AI, email notifications, real listings by real students logged in `docs/real-deals.md`.
**Could:** pay from another chain via 1Click, dispute flow, connect an existing wallet, Bahasa toggle.
**Won't:** mainnet, shipping, payments outside escrow, account recovery beyond "export key".

Non-goals: shipping integration, delivery tracking, seller-side per-buyer negotiation (the minimum is set once per listing), moderation tooling beyond what Supabase gives.
Anti-goals (a failure even if it works): any path where a buyer sees or infers the seller's minimum beyond 1 bit per round and the capped offers; free-form chat before a deal; visible chain (gas prompts, seed phrases, wallet pop-ups in the main flow).

## Feature specs and acceptance criteria (Must)
| # | Acceptance criteria (each is testable) |
|---|---|
| 1 | From a fresh browser, signing in with an email link creates a `profiles` row and, within 15 s, a funded testnet account stored in `profiles.near_account_id`. `POST /accounts` without a valid Supabase JWT returns 401; a second call for the same user returns 409; the per-IP limit returns 429; the secret key is never sent to the relayer. |
| 2 | A signed-out visitor to `/@handle` sees avatar, display name, bio, city, active listings and sold count; an unknown handle shows "not found". Sold count equals the seller's listings in state Sold. |
| 3 | Creating a listing with 5 photos succeeds and a 6th is rejected. `get_listing` shows `seller_cts` and `seller_commits` (one entry each) and no plaintext; the commitment equals the v2 seller string when the owner reveals it in a test; `max_rounds` outside 1..=3 panics. No price or minimum appears in the page, the Supabase row or the photo metadata. |
| 4 | The home grid, signed out, shows only listings whose `chain_state` is Open. A search term matches title or description; the category filter narrows the grid; both work together. |
| 5 | The listing page shows photos, details, seller card, the "Blind offer" badge and "N of 10 offers used" equal to `offers_made`. At 10 it shows "Offers full" and the offer button is disabled. |
| 6 | An answer present in the listing text or an answered Q&A is returned. A question not covered returns the unknown marker and the app shows "Ask the seller". A question about price, offers or the minimum is declined. A unit test shows the prompt context built by the relayer holds only listing text and answered Q&A. |
| 7 | A signed-in buyer can insert a question; a signed-out visitor cannot. Only the listing's seller can set `answer`; any other update is rejected by RLS. Unanswered questions are not shown to the public. |
| 8 | Ciphertext over 512 bytes is rejected. A second `make_offer` by the same buyer on the same listing panics; `make_offer` on a non-Open listing or when `offers_made == 10` panics; a call while another deal on the listing is Computing panics "busy". A lowered buyer round gives a no-deal from the TEE. Seller_min <= buyer_max gives `matched=true` and a price within [min, max]; otherwise `matched=false`, price absent. Unit tests in `tee/` run offline. A callback from any account other than `outlayer.testnet` is rejected. Both clients show the same state within 5 s of the callback and the reveal shows only the price or "no deal". |
| 9 | A match sets the deal to Matched and the listing to Reserved. `deposit` of exactly `price` by the buyer moves the deal to Funded; `confirm_received` by the buyer pays the seller and sets the listing Sold. `refund` after the deadline and `expire` on an unfunded match set the listing back to Open. Every wrong caller or state call panics; no owner-only method exists. |
| 10 | Before Matched, `threads.open` is false and `POST /threads/:dealId/open` returns 409; a message insert is rejected. After Matched the call opens the thread; only the buyer and seller can read or insert; a third account reads nothing; a message appears on the other side within 5 s. |
| 11 | A fresh clone plus README steps ends at the hosted demo. `npm run demo:seed` creates the shop `@demo` with several listings: one with a Released deal, one with a NoDeal result and one Open. |

## Success criteria (rubric, equal weights)
- Gate, reproducible: README "do X, see Y" passes on a clean machine; hosted demo up until 11-25.
- Technical: Rust contract with tests; sub-accounts, TEE via OutLayer, cross-contract callback; commitments on-chain; Supabase RLS covered by tests.
- Design: IDENTITY.md applied; chain invisible (no gas, no seed prompt); the shop arrival and the reveal as the signature moments.
- Impact: outcomes logged in `docs/real-deals.md` if time allows; metric "deals that would have failed to start". No count is promised.
- Originality: blind-price negotiation inside a second-hand marketplace. The earlier claim (373 entries, only negotiation entry, per IDEAS.md) is not re-checked for the marketplace version.
- Sustainability: UNVERIFIED path; candidate is a small fee on escrowed deals. State it as a hypothesis in the README.

## Track sections
Tag every track the project honestly fits (no cap on tags per the rules verified 2026-11-12; whether one project can win several tracks is not stated). Proposal: `privacy`, `agents`, `realworld`. The final list is the team's call at submission.

**Privacy (primary).** Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret (the private-dao-example pattern). The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned, and returns only `{deal_id, matched, price}`. The seller's minimum is sealed once per listing; no listing shows a price. The relayer, Supabase and the assistant never see a limit. Each buyer account learns at most 1 bit per round and offers per listing are capped at 10. Should: a "Verified" panel with a fresh nonce showing the WASM hash and the NEAR AI attestation. Stated limits: OutLayer governance is still centralised; the match bit and price leak some information; users trust the served frontend.
**Agents.** The AI product assistant (NEAR AI Cloud, through the relayer) answers questions about a listing from its text and public Q&A. It never discusses price, offers or the minimum and never receives them. The AI negotiator (natural-language limit into numbers) is added to this tag only if it ships; a deterministic rule in the WASM, not an LLM, always decides the match.
**Realworld.** Escrowed payments for real second-hand sellers who already have a bio link: README readable by a non-technical user, paid/pending/refunded states, tx links.

## Risk register
| Risk | Likelihood | Impact | Mitigation | Fallback |
|---|---|---|---|---|
| OutLayer unknowns (ECIES with PROTECTED_ secrets, testnet workers, fees) | L | H | Spike done (D1-08), contract and TEE work on testnet; v2 redeploy rehearsed with `scripts/roundtrip.mjs` | Matching service with a signing key registered in the contract |
| Browser-held keys lost or stolen | M | M | "Export key" and "import key" screens; testnet only | Re-create the account and relist |
| Relayer abuse (account farming) | M | M | Supabase JWT required; one NEAR account per user; per-IP limit; small funding; cap total spend | Disable creation, use seeded accounts |
| Testnet faucet dry | M | H | Fund the relayer early; keep a reserve | Fewer demo accounts, reuse |
| Two-sided demo needs two devices | H | M | Seeded shop `@demo` with finished deals | Recorded video |
| Strategic misreporting (Myerson-Satterthwaite) | H | L | Binding deals; state the limit in README | None needed |
| Probing across rounds ("egg drop") | M | M | Max 3 rounds, seller-chosen; a match is binding and reserves the item; buyers can only raise; README states leak of at most 1 bit per round | Seller sets 1 round |
| Laddering (buyer starts low, steps up) | H | L | Accepted: it is private haggling; seller never gets less than their own minimum | Seller sets 1 round |
| Sybil probing with the 10-offer cap | M | M | One NEAR account per Supabase user (relayer-enforced); each offer attaches the OutLayer fee; cap of 10 offers per listing; a match reserves the item, so probing upward costs a reservation. Stated in README | Seller closes the listing and relists |
| Supabase or RLS mistakes leak chat | M | H | RLS rules table in DATA-MODEL.md; a test per rule with a third account; messages insertable only when `open`; no limits or keys in Supabase | Disable chat, show deals without it |
| Schedule risk of the pivot | H | H | Freeze 2026-11-14 00:00 UTC; Should items cut first; reuse the working contract, TEE, escrow and relayer; app built on mocks first | Ship the Must items that work; seeded demo covers the rest |
| NEAR AI credit is a separate $10 key from nearbuilders.org/dashboard (does not show in cloud.near.ai) | M | M | Claim the key on 11-12; per-IP and global daily cap on `/assistant` | Assistant answers "unknown" and offers "Ask the seller" |
| OutLayer centralisation | H | M | State it in README and pitch | None |

## Milestones
- 11-12 evening: TypeScript types v2, Supabase schema, screens on mocks.
- 11-13: contract and TEE v2 redeploy, relayer endpoints, screens, assistant, seed, hosting, wiring.
- 11-14 00:00 UTC: feature freeze.
- 11-14 12:00 UTC: submit (repo public, X post live; both need the whole team). 23:59 UTC is buffer only.

## Open questions
Resolved 2026-11-10 in DECISIONS.md: result trust (callback path Must, enclave signature Should), units (Rupiah in, fixed demo rate to testnet NEAR), randomness (TEE), account naming (parent account once the name is final), NEAR AI key (relayer proxy, E2EE prompts).
Resolved 2026-11-12 in the design doc: schedule, no chat before a deal, sealed minimum once per listing, Google or email sign-in, Supabase for descriptive data.
Still open:
1. A seller can close a listing and relist it with a different minimum. Accepted: each buyer still gets at most the seller's chosen rounds per listing, and the seller learns only "deal / no deal" from a buyer who offers. A relist resets the offer cap; stated in the README.
2. Whether one project can win several tracks is not stated in the rules; the final track list is the team's call.
3. Builder's call: category list, photo size limits, search ranking, unfunded-match expiry and delivery window values (PR #30), NEAR AI model, retry on "busy", handle format and reserved handles.
4. PR #30 (late deposit, delivery window) is merged first or branched from; the contract v2 ships in one redeploy with it.
