# Assumptions

Tag: `verified (source)` or `unverified (how to verify)`.

## Rules and submission
- Deadline is 2026-11-14T23:59:00Z; submissions only accepted 2026-11-01 to then. — verified (HACKATHON.md)
- One submission per repo, no edits; fixes via https://nearhackathon.com/request-changes (manual review). There is no "draft then update" path. — verified (HACKATHON.md)
- Code from 2026-10-19 announcement onward counts. — verified (HACKATHON.md Q-001)
- Libraries, templates, AI code allowed; list in README. LICENSE file required-ish (Q-014). — verified (HACKATHON.md Q-005, Q-014)
- No mandatory sponsor integration; own NEAR contract fitting the track is enough. — verified (Q-011)
- Testnet-only projects are eligible; NEAR Intents has no testnet (mainnet, tiny amounts, `dry: true` quotes). — verified (Q-007, Q-010)
- Local-only demo OK only with a video; hosted demo is a plus, keep up to 2026-11-18 (ideally 11-25). — verified (Q-012)
- AI screening (Claude Code + Codex) checks the repo runs and does what the README says; humans decide. — verified (Q-017)
- Team size of 4 fits both `"2 - 4"` and `"4 - 6"`. — verified (API contract); choice is the human's.
- A submission may tag every track the project fits; there is no cap on tags. — verified 2026-11-12 (live HACKATHON.md: "Put the id of every track the project fits"). The earlier "~2 tracks" was our own working assumption, not a rule.
- One project can win prizes in more than one track. — unverified (rules are silent; ask in NEAR Discord / Telegram). Judges are per track, so tag only tracks the README can defend.
- Submission team size `"2 - 4"` (team of 4). — decided by Ezra 2026-11-09
- Grand prize winner can also take a track prize. — unverified (ask organizers)
- X video upload limit for a non-Premium account is 2:20. — unverified (check X help page)

## Field
- Gallery snapshot 2026-11-09: 373 public submissions; security 182, agents 179, realworld 78, privacy 68, business 67, open 66, defi 62, thesis 33, swarms 32, nfts 29, games 28, social 28, memecoins 20. — verified (https://nearhackathon.com/api/projects, raw/gallery.json)
- Gallery shows only public submissions; more teams will submit before 11-14. — unverified (assume total ends ~2x current)

## Blind deal tech (spike 2026-11-10, raw/tee-spike.md)
- OutLayer runs custom WASM in a TDX TEE, callable from a NEAR contract via `outlayer.testnet` `request_execution`, with TEE-generated PROTECTED_ secrets; closest template: github.com/out-layer/private-dao-example. — verified (docs, per spike)
- PROTECTED_ secrets usable for ECIES decryption of browser-encrypted limits and for signing. — unverified (build a 2-3 h spike first thing in the build)
- OutLayer fees, testnet worker availability, network access. — unverified (spike)
- OutLayer governance is centralised; must be stated in README/pitch. — verified (per spike)
- NEAR AI Cloud: documented E2EE (X25519/XChaCha20) and attestation at /v1/attestation/report; cannot run custom code. Browser E2EE flow works. — unverified (spike)
- NEAR AI credits from NEAR Builders come as a separate API key with a $10 balance, claimed at nearbuilders.org/dashboard; they do not appear in cloud.near.ai. — verified 2026-11-12 (live HACKATHON.md Q-000)
- Supabase free tier covers Auth (email link, Google), Postgres, Storage and Realtime for a demo of this size. — unverified (check the Supabase pricing page when creating the project, MK-10)
- Fallbacks: (1) server key registered in contract, stated trust; (2) commit-reveal. — design decision
- Testnet faucet amount and rate limit. — unverified (near-faucet.io claims conflict: 2 NEAR/claim vs 100 NEAR/30 min; docs.near.org faucet page 410). Verify by using it on day 1 (D1-09).
