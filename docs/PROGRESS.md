# Progress

Mirrors docs/plans/IMPLEMENTATION.md (marketplace plan, Revision B: slots and two sign-ins, 2026-11-12). Tick a box only after the task's done-check passes; add the owner's initials.

## Done before and during the pivot
- [x] D1-01 scaffold (HA) · D1-04/05 contract stub and TS types (EZ) · D1-07 tokens (RAP) and identity G #33 (RAP) · D1-08 OutLayer spike (EZ) · D1-10 test UI on mocks (HA) · D1-11 single-link screens (RAP)
- [x] M1-01..M1-07 contract, WASM, deploy, round trip (EZ) · G1 passed · S-05 escrow edge cases #30 (EZ) · secret locked to the WASM build #31 (EZ) · M1-14 stickers and icons #41 (RAP)
- [x] **MKT-01** Marketplace API: Supabase schema, listings, photos, slots, claim, sync #35 (HA)

## Still needed from the old plan
- [ ] **D1-02** CI (BI)
- [ ] **D1-03** Render hello-world (BI)

## Block A: 2026-11-12 evening
- [x] **MK-04** Client crypto, real contract client, slot helper (EZ)
- [ ] **MK-10** Supabase: apply 0001, add 0002 (BI)
- [x] **MK-30** Marketplace screens in Claude Design (DP): 32 frames, `docs/design/shake-marketplace-screens.html` (#77), linked in #70

## Block B: 2026-11-13 00:00-12:00 UTC
- [x] **MK-07** Marketplace round trip on testnet (CT): `npx tsx scripts/marketplace-roundtrip.mts` on the real Supabase store passes (13 runs: 10 matched through reserved, Received and sold, 3 hit an OutLayer execution failure that #106 now hands back; see DECISIONS)
- [x] **G2** Gate 12:00 UTC: MK-07 green (lead): the marketplace round trip passes live on Supabase, including a second round and a second buyer on a reserved listing (2026-11-13)
- [x] **MK-11** `POST /accounts` with Supabase JWT (BI)
- [x] **MK-12** Relayer: profiles, questions, messages, inbox, reserved sync (BI)
- [ ] **MK-20** Google/email sign-in, handle, keys (BI): screens, key backup and wallet button built by DP in PR; the live Google/email run waits on the Supabase Auth settings (#96)
- [x] **MK-06** NEAR wallet login (CT): code and live key checks pass (EZ); real Meteor session on 2026-11-13: a wallet seller published a listing and a second wallet bought it, paid through the Meteor popup and pressed Received (deal 59 Released on chain)
- [x] **MK-21** Browse, search, seller profile (FE): #50, restyled to the frames in #84; checked in the browser on seed data; not yet run against the live relayer
- [x] **MK-22** Create listing (FE): #60, asking price #69; done-check run on the mock chain with the dev relayer (DP, 2026-11-13): 3 photos uploaded, the listing shows on `/` and on the shop, the minimum (4137000) is in no request body; 3 slots are made at publish (`SLOTS_AT_PUBLISH`), the seller adds up to 10 from the own-listing panel; the live run needs sign-up (#107)
- [ ] **MK-23** Listing page: assistant and Q&A (FE): #74, assistant fallback on 429/503; unit-tested; on the mock chain (DP, 2026-11-13) an unknown question shows "Ask the seller", the question lands in the seller's inbox, the answer shows to a signed-out visitor; the assistant answering itself is still unchecked (the dev relayer returns 503 without a NEAR AI key, so the page falls back to "Ask the seller")

## Asking price (decided 2026-11-13)
- [ ] **MK-15** Asking price in the API (BI): code, tests and migration 0003 written by CT (PR); the migration is not yet applied to the hosted project
- [x] **MK-26** Asking price in the screens (FE): #69, offer cap in #80; the live `askingPrice` field depends on MK-15's migration being applied
- [x] **MK-32** Asking price in the frames (DP)

## Block C: 2026-11-13 12:00-24:00 UTC
- [x] **MK-05** AI product assistant (CT): `POST /assistant` live-model checks pass; the asking price joins the prompt once MK-15 lands
- [ ] **MK-24** Offer flow (FE): #80, restyled in #90; unit-tested; two browser profiles on the mock chain (DP, 2026-11-13): offer below the minimum gives no deal, the buyer raises, the seller opens round 2 from the inbox, "It's a deal" at Rp 1.503.190 inside the overlap, pay, Received, "Paid out", the listing is sold (leaves browse, the shop shows 1 sold); the two-browser testnet run (gate G3) is still open
- [x] **MK-25** Chat and inbox (FE): #81, restyled in #90; unit-tested; live run still open
- [x] **MK-31** Seed photos (DP): `seed/` with 6 freely licensed photos, listings and sources
- [ ] **MK-14** Seed: demo shop (BI)
- [ ] **MK-40** End-to-end happy path (BI)
- [ ] **S-06** Hosted deploy (BI)
- [ ] **G3** Gate 20:00 UTC: MK-24 green on testnet (lead)

## Should (after G3)
- [ ] **S-02** AI negotiator
- [ ] **S-01** Verified panel
- [ ] **S-12** Link a Google login to a wallet
- [ ] **S-11** Ratings, saved items, email notifications
- [ ] **S-13** Contract-level single sale
- [ ] **S-07** Enclave-signed results
- [ ] **S-08** Real listings by real students

## 2026-11-14: freeze 00:00 UTC, submit by 12:00 UTC
- [ ] **P-04** Freeze
- [ ] **P-01** README on a clean clone
- [ ] **P-02** Video and visuals
- [ ] **P-03** X post and pitch text
- [ ] **P-05** Submit
