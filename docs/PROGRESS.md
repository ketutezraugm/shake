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
- [ ] **MK-30** Marketplace screens in Claude Design (DP)

## Block B: 2026-11-13 00:00-12:00 UTC
- [ ] **MK-07** Marketplace round trip on testnet (CT): chain half passes (EZ); Supabase half waits on MK-10 and MK-12
- [ ] **G2** Gate 12:00 UTC: MK-07 green (lead)
- [x] **MK-11** `POST /accounts` with Supabase JWT (BI)
- [x] **MK-12** Relayer: profiles, questions, messages, inbox, reserved sync (BI)
- [ ] **MK-20** Google/email sign-in, handle, keys (BI)
- [ ] **MK-06** NEAR wallet login (CT): code and live key checks pass (EZ); one real wallet session still open
- [ ] **MK-21** Browse, search, seller profile (FE): logic and routes in PR, visuals wait on MK-30, live data on #47
- [ ] **MK-22** Create listing (FE)
- [ ] **MK-23** Listing page: assistant and Q&A (FE)

## Block C: 2026-11-13 12:00-24:00 UTC
- [ ] **MK-05** AI product assistant (CT)
- [ ] **MK-24** Offer flow (FE)
- [ ] **MK-25** Chat and inbox (FE)
- [ ] **MK-31** Seed photos (DP)
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
