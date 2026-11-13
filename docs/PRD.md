# PRD: Shake (formerly Blind deal)

Deadline 2026-11-14T23:59Z (hard wall, buffer only). Feature freeze 2026-11-14 00:00 UTC. Submit by 12:00 UTC 11-14. Decisions come from BUILD-BRIEF.md and, for the marketplace pivot, docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md (Revision B wins); this file does not change them.

## Problem
Haggling punishes whoever names a number first. A seller asks 5M, the buyer would have paid 5.5M, and neither learns it. People walk away from deals both wanted because neither will show a limit.
Second-hand sellers already have an audience: they put a link in their Instagram or marketplace bio. But every sale there starts in a DM where the first number named loses. A listing with a public price starts the same fight.

## Users
- Seller: a person who sells used items and has a bio link (Instagram or a marketplace profile). Lists once. Must come back to the app for a later round after a no-deal.
- Buyer: someone who taps that bio link, lands on the seller's shop at `/@handle`, and wants an item without opening a haggle.
- Judge / AI screener: clones the repo, follows the README, opens the hosted demo and the seeded shop `@demo`.

## User stories
1. As a seller, I put one profile link in my bio, so buyers arrive at my shop and I do not quote a price in a DM.
2. As a seller, I list an item with photos and an asking price, and seal my real floor below it, so buyers can browse by budget without learning how low I would go.
3. As a buyer or seller, I sign in with Google or an email link, or with my NEAR wallet.
4. As a buyer, I browse and search open listings and ask the assistant about an item without talking to the seller.
5. As a buyer, I ask the seller a question when the assistant does not know, and see the answer on the listing.
6. As a buyer, I claim a place in the seller's queue, enter a blind maximum, and as either side I see "no deal" and nothing else when the ranges do not overlap.
7. As a seller, when a round ends in no deal, I see "Round 2 requested" in my inbox and answer with one tap.
8. As a buyer, I pay into escrow and get a refund if the item never arrives.
9. As a seller, I get paid when the buyer confirms "Received".
10. As both sides of a deal, we chat once the deal matches, and not before.
11. As a judge, I open a seeded demo shop without two devices.

## Magic moment
A buyer taps the bio link and lands in the seller's shop, where every item has an asking price and nobody can see how low the seller would go. Later both phones show the same reveal at the same time: "Deal at Rp X", or "No deal", with no other number shown.

## Scope (from the design doc, Revision B)
**Must (by the freeze, 2026-11-14 00:00 UTC):**
1. Sign-in with Google or email, or a NEAR wallet. Google or email browses and asks (assistant, public questions) but has no NEAR account; selling and buying need a NEAR wallet, which pays its own fees (DECISIONS.md, 2026-11-13).
2. Seller profile at `/@handle`: avatar, display name, bio, city, active listings, sold count. This is the bio link.
3. Create listing: title, description, up to 4 photos, category, rounds (1-3, default 2), a required asking price (shown publicly) and a sealed minimum at or below it (never shown). The app creates up to 10 slots (pre-created deals) for it.
4. Public browse: home grid of open listings with their asking prices, text search, category filter.
5. Listing page: photos, details, asking price, seller card, "Blind offer" badge, free-slots counter, AI assistant, public Q&A.
6. AI product assistant (NEAR AI Cloud via the relayer): answers from the listing and its public Q&A only; when unsure it says so and offers "Ask the seller".
7. Public Q&A: signed-in buyers ask; only the seller answers; answered questions show on the listing.
8. Blind offer: the buyer claims a slot, enters a maximum up to the asking price (encrypted in the browser to the TEE key), up to the listing's rounds, raising only. Offering the asking price always matches, at a price between the seller's floor and the ask. Later rounds need the seller's resubmission. Reveal shows "Deal at Rp X" or "No deal".
9. On a match the listing becomes reserved; buyer pays into escrow; "Received" releases to the seller and the listing becomes sold. When the reserving deal expires or is refunded, the listing is open again.
10. Chat per deal, opened at Matched, between the two parties only, through relayer endpoints.
11. Seeded demo shop with several listings (the team's own photos of real items) and slots: one Released deal with a short chat, one NoDeal, the rest open.
12. Buyer or seller at sign-up (wallet accounts). The choice only sets the navigation (buyers: Browse · Saved · My offers · Inbox) and can be switched from the account menu; the account is the same either way. Buyers have **My offers**: every deal they made an offer on, with its state and next step.
13. Escrow exits in the app. A paid buyer can take the money back after the delivery deadline ("Get my money back", contract `refund`). A seller can reopen a listing whose buyer matched but never paid within 24 h ("Reopen listing", contract `expire`).

Seller notifications are in-app only in the Must build: an inbox and badge for new questions, rounds waiting for the seller, matches and unread messages, polled from `GET /me/inbox` every 10 s.

**Should:** AI negotiator (natural-language limit), Verified attestation panel, seller ratings after Sold, saved items synced across devices (saved items on one device are MK-55), seller lowers the minimum on a live listing, linking a Google login to a wallet, E2EE prompts to NEAR AI, email notifications, real listings by real students logged in `docs/real-deals.md`.
**Could:** pay from another chain via 1Click, dispute flow, Bahasa toggle.
**Won't:** mainnet, shipping, payments outside escrow, account recovery beyond "export key", a shopping cart (every item is its own blind negotiation and escrow, with nothing to total or pay together).

Non-goals: shipping integration, delivery tracking, seller-side per-buyer negotiation (the minimum is set once per listing, per round the seller can only resubmit the same or a lower one), moderation tooling.
Anti-goals (a failure even if it works): any path where a buyer sees or infers the seller's minimum beyond 1 bit per round and the capped slots; free-form chat before a deal; visible chain for Google or email users (gas prompts, seed phrases, wallet pop-ups). Wallet users see their wallet's pop-ups; that is expected.

## Feature specs and acceptance criteria (Must)
| # | Acceptance criteria (each is testable) |
|---|---|
| 1 | Google or email: signing in gives a Supabase session; `POST /assistant` and `POST /listings/:id/questions` accept its bearer token, every other route answers 401 to it, and `POST /accounts` no longer exists. Wallet: sign-in yields a function-call access key on the deal contract; a relayer request signed with that key is accepted, one signed with an unknown key gets 401. A `profiles` row exists for either path, keyed by NEAR account id. |
| 2 | A signed-out visitor to `/@handle` (`GET /profiles/:handle`) sees avatar, display name, bio, city, active listings and sold count; an unknown handle shows "not found". Sold count equals the seller's listings with status `sold`. `PUT /me/profile` changes only the caller's row. |
| 3 | Creating a listing with 4 photos succeeds and a 5th returns 409. `maxRounds` outside 1..=3 is refused. `POST /listings/:id/slots` accepts a slot only when the deal is on chain, belongs to the caller, is `Waiting` with no buyer, has the listing's `max_rounds`, and the link token hashes to `link_hash`; otherwise 400. An 11th slot returns 409. `askingPrice` is required, whole Rupiah, nonzero (else 400). The app refuses a minimum above the asking price before any request. No minimum appears in the page, the Supabase row, a response or the photo metadata. |
| 4 | The home grid, signed out, shows only listings with status `open`, each with its asking price. A search term matches title or description; the category filter narrows the grid; both work together. |
| 5 | The listing page shows photos, details, the asking price, seller card, the "Blind offer" badge and `freeSlots`. The offer field refuses a number above the asking price. At 0 free slots it shows "Offers full" and the offer button is disabled. |
| 6 | An answer present in the listing text or an answered Q&A is returned. A question not covered returns `{unknown:true}` and the app shows "Ask the seller". The assistant may repeat the asking price; a question about offers, discounts or the seller's minimum is declined. A unit test shows the prompt context built by the relayer holds only listing text and answered Q&A. The 21st request in an hour from one account returns 429. |
| 7 | A signed-in buyer can post a question (`POST /listings/:id/questions`); an unsigned request gets 401. Only the listing's seller can answer (`POST /questions/:id/answer`); anyone else gets 403. `GET /listings/:id/questions` returns answered questions only. |
| 8 | `POST /listings/:id/claim` returns the caller's slot, and the same slot on repeat; 409 when none is free; 409 unless the listing is `open`; 403 for the seller. Ciphertext over 512 bytes is rejected by the contract. A lowered buyer round gives a no-deal from the TEE. Seller_min <= buyer_max gives `matched=true` and a price within [min, max]; otherwise `matched=false`, price absent. Unit tests in `tee/` run offline. A callback from any account other than `outlayer.testnet` is rejected. After a no-deal with rounds left, the buyer sees "waiting for the seller" until the seller resubmits (the seller's inbox shows "Round 2 requested"); the buyer cannot complete round 2 alone. Both clients show the same state within 5 s of the callback and the reveal shows only the price or "no deal". |
| 9 | A match sets the deal to Matched, and `POST /listings/:id/sync` sets the listing `reserved`; the seller's app then cancels unclaimed and still-Waiting slots. A second buyer whose deal also matched sees "Another buyer got there first" and no pay button. `deposit` of exactly `price` by the buyer within 24 h moves the deal to Funded; later it panics. `confirm_received` by the buyer pays the seller; sync sets the listing `sold`. When the reserving deal ends (`expire`, or `refund`), sync sets the listing back to `open`. Every wrong caller or state call panics; no owner-only method exists. |
| 10 | `GET` and `POST /deals/:dealId/messages` refuse (403) an account that is neither seller nor buyer of the deal, and refuse (409) a deal that is not Matched, Funded, Released or Refunded. Between the two parties a message appears on the other side within 5 s (chat polls every 3 s). |
| 11 | The anon Supabase key reads and writes no table (every select, insert, update and delete returns an error or nothing, and `claim_slot` is not callable). A fresh clone plus README steps ends at the hosted demo. `npm run demo:seed` creates the shop `@demo` with several listings and slots: one with a Released deal and a short chat, one with a NoDeal result, the rest open. |
| 12 | A new wallet account that picks "buy" never sees "Name your shop", lands on `/`, and has the tabs Browse, Saved, My offers, Inbox. My offers lists every deal from `GET /me/negotiations`, each with the state `offerView` gives it. |
| 13 | A Funded deal past its deadline shows "Get my money back" and ends Refunded, with the price returned to the buyer. A Matched deal left unfunded for 24 h shows "Reopen listing" to its seller, ends NoDeal, and the listing is `open` again after sync. |

## Success criteria (rubric, equal weights)
- Gate, reproducible: README "do X, see Y" passes on a clean machine; hosted demo up until 11-25.
- Technical: Rust contract with tests; sub-accounts, TEE via OutLayer, cross-contract callback; commitments on-chain; relayer tests for auth, claim and sync; Supabase closed to the anon key.
- Design: IDENTITY.md applied; chain invisible while browsing and asking as a Google or email user; the shop arrival and the reveal as the signature moments.
- Impact: outcomes logged in `docs/real-deals.md` if time allows; metric "deals that would have failed to start". No count is promised.
- Originality: blind-price negotiation inside a second-hand marketplace. The earlier claim (373 entries, only negotiation entry, per IDEAS.md) is not re-checked for the marketplace version.
- Sustainability: UNVERIFIED path; candidate is a small fee on escrowed deals. State it as a hypothesis in the README.

## Track sections
Tag every track the project honestly fits (no cap on tags per the rules verified 2026-11-12; whether one project can win several tracks is not stated). Proposal: `privacy`, `agents`, `realworld`. The final list is the team's call at submission.

**Privacy (primary).** Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret (the private-dao-example pattern). The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned, and returns only `{deal_id, matched, price}`. The seller's minimum stays in the seller's browser and the TEE; no listing shows a price. The relayer, Supabase and the assistant never see a limit. Each buyer account learns at most 1 bit per round and slots per listing are capped at 10. Should: a "Verified" panel with a fresh nonce showing the WASM hash and the NEAR AI attestation. Stated limits: OutLayer governance is still centralised; the match bit and price leak some information; the relayer holds link tokens; users trust the served frontend.
**Agents.** The AI product assistant (NEAR AI Cloud, through the relayer) answers questions about a listing from its text and public Q&A. It never discusses price, offers or the minimum and never receives them. The AI negotiator (natural-language limit into numbers) is added to this tag only if it ships; a deterministic rule in the WASM, not an LLM, always decides the match.
**Realworld.** Escrowed payments for real second-hand sellers who already have a bio link: README readable by a non-technical user, paid/pending/refunded states, tx links.

## Risk register
| Risk | Likelihood | Impact | Mitigation | Fallback |
|---|---|---|---|---|
| OutLayer unknowns (ECIES with PROTECTED_ secrets, testnet workers, fees) | L | H | Spike done (D1-08); contract and TEE already work on testnet and are unchanged; slot round trip rehearsed with `scripts/roundtrip.mjs` (gate G2) | Matching service with a signing key registered in the contract |
| Browser-held keys lost or stolen | M | M | "Export key" and "import key" screens; testnet only; wallet users keep their keys in the wallet | Re-create the account and relist |
| Relayer abuse (account farming) | M | M | Supabase JWT required; one NEAR account per user; per-IP limit; small funding; cap total spend; wallet users pay their own fees | Disable creation, use seeded accounts |
| Testnet faucet dry | M | H | Fund the relayer early; keep a reserve | Fewer demo accounts, reuse |
| Two-sided demo needs two devices | H | M | Seeded shop `@demo` with finished deals | Recorded video |
| Strategic misreporting (Myerson-Satterthwaite) | H | L | Binding deals; state the limit in README | None needed |
| Probing across rounds ("egg drop") | M | M | Max 3 rounds, seller-chosen; a match is binding and reserves the item; buyers can only raise; README states leak of at most 1 bit per round | Seller sets 1 round |
| Laddering (buyer starts low, steps up) | H | L | Accepted: it is private haggling; seller never gets less than their own minimum | Seller sets 1 round |
| Sybil probing with the 10-slot cap | M | M | One NEAR account per Supabase user (relayer-enforced); one slot per buyer per listing; the round-completing call attaches the OutLayer fee; a match reserves the item. Stated in README | Seller closes the listing and relists |
| Double match window: two slots match before sync reserves the listing | M | M | Sync after every chain call; the seller's app cancels unclaimed and Waiting slots on reservation; the second buyer sees "Another buyer got there first" and no pay button; the unfunded match expires after 24 h. Stated in README | Seller closes the listing |
| Seller must return for later rounds (the contract takes one submission per side per round) | H | M | Inbox shows "Round 2 requested"; one tap resubmits the same minimum with a new salt; buyer sees "waiting for the seller"; default 2 rounds | Seller sets 1 round |
| Relayer holds the slots' link tokens | M | M | A token only lets its holder be the buyer on one deal; it opens no money or limit; `/me/listings` never returns it to sellers or browse; stated in README | None needed |
| Wallet UX popups (NEAR Connect, payable calls via the wallet) | M | M | Wallet path is the second sign-in; the function-call key signs everything non-payable; Google or email stays the main flow | Ship Google or email only |
| Contract pays storage for up to 10 deals per listing | M | M | Fund the contract account before the seed and demo; the 512-byte ciphertext cap bounds each deal; 10 slots per listing | Fewer slots per listing |
| Supabase misconfiguration exposes a table to the anon key | L | H | RLS on with no policies and grants revoked (migrations 0001, 0002); a test that the anon key reads and writes nothing; no limits or keys in Supabase | Rotate keys, disable the endpoint |
| Schedule risk of the pivot | H | H | Freeze 2026-11-14 00:00 UTC; Should items cut first; reuse the working contract, TEE, escrow and relayer (PR #35); app built on mocks first | Ship the Must items that work; seeded demo covers the rest |
| NEAR AI credit is a separate $10 key from nearbuilders.org/dashboard (does not show in cloud.near.ai) | M | M | Claim the key on 11-12; per-account hourly limit and a global daily cap on `/assistant` | Assistant answers "unknown" and offers "Ask the seller" |
| OutLayer centralisation | H | M | State it in README and pitch | None |

## Milestones
- 11-12 evening: TypeScript types, migrations 0001 and 0002, screens on mocks.
- 11-13: slot round trip on testnet (gate G2, 12:00 UTC); relayer endpoints, both sign-ins, screens, assistant, seed, hosting; UI flow on testnet (gate G3, 20:00 UTC).
- 11-14 00:00 UTC: feature freeze.
- 11-14 12:00 UTC: submit (repo public, X post live; both need the whole team). 23:59 UTC is buffer only.

## Open questions
Resolved 2026-11-10 in DECISIONS.md: result trust (callback path Must, enclave signature Should), units (Rupiah in, fixed demo rate to testnet NEAR), randomness (TEE), account naming (parent account once the name is final), NEAR AI key (relayer proxy, E2EE prompts).
Resolved 2026-11-12 in the design doc (Revision B): schedule, no chat before a deal, contract and TEE unchanged, slots, two sign-ins, Supabase relayer-only.
Still open:
1. A seller can close a listing and relist it with a different minimum. Accepted: each buyer still gets at most the seller's chosen rounds per listing, and the seller learns only "deal / no deal" from a buyer who offers. A relist resets the slot cap; stated in the README.
2. Whether one project can win several tracks is not stated in the rules; the final track list is the team's call.
3. Builder's call: photo size limits beyond the bucket's 2 MB, search ranking, NEAR AI model, handle format and reserved handles, the NEAR Connect package and version (verify at build), the funding amount per account.
4. Linking a Google login to a wallet later is Should.
