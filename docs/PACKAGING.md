# Packaging: [NAME]

Draft 2026-11-11. Binding sources: PRD, IDEAS (Blind deal), DECISIONS, RECON 1/4/5, HACKATHON "2. The demo post". Demo numbers (seller 5.0M, buyer 5.5M, deal 5.2M) are seed values, [TBD: confirm in `demo:seed`]. Anything unverified is `[TBD: ...]`.

## 1. Demo video script (target 2:10, captions on)

| Time | Shot | On-screen | Voiceover |
|---|---|---|---|
| 0:00-0:05 | Two students' hands, two phones, a laptop photo | "Seller asks 5M. Buyer would pay 5.5M. Neither says so." | "Whoever names a number first loses. So people walk away from deals both of them wanted." |
| 0:05-0:20 | Split screen: both phones. Each types a number, taps Confirm. Both reveal at once | Reveal: "Deal at Rp 5,200,000". No other number | "Here, each person types their real limit. Neither sees the other's. Both confirm, and both phones show the same answer: a deal, at 5.2 million." |
| 0:20-0:35 | Seller creating the deal, copying the link; buyer opening it, no wallet prompt | "No wallet. No seed phrase." | "The seller sends one link. The buyer opens it and types a number. Accounts are created in the browser." |
| 0:35-1:00 | Animation: number encrypted on the phone, arrow to a sealed box | "Encrypted on your phone". "Runs in a TEE on OutLayer" | "Each limit is encrypted before it leaves the phone. Only code running in a secure enclave can open it, and that code is public and hash-pinned. We can't read your number either." |
| 1:00-1:20 | Verified panel with nonce; explorer showing ciphertext and commitment hash | "Attested code hash". "On-chain: ciphertext + commitment" | "A fresh attestation shows which code ran. On NEAR you can see only ciphertext and a hash, never the number." [TBD: show only if the panel ships] |
| 1:20-1:40 | Buyer pays into escrow; item handed over; buyer taps Received; seller balance updates | "FUNDED" then "PAID" | "The buyer pays into an escrow contract. When the item arrives and the buyer taps Received, the seller is paid. If it never arrives, the buyer gets a refund. There is no admin key." |
| 1:40-1:55 | Unmatched deal: "No deal", then "Round 2 of 2", buyer raises | "Seller picks 1 to 3 rounds" | "If there's no deal, both can try again. Buyers can only go up, sellers only down. Each round reveals only deal or no deal." |
| 1:55-2:05 | Plain text card | "Limit: the enclave operator, OutLayer, is still centralised. We say so in the README." | "One honest limit: OutLayer is not yet fully decentralised, and you trust it to run the public code." |
| 2:05-2:10 | Logo, repo URL, demo URL | "[NAME]. Built at NEAR HACKATHON" | "[NAME]. Try it with a friend." |

## 2. X demo post

**Main (about 270 chars):**
> Selling a laptop: you say 5M, they'd pay 5.5M, nobody finds out. [NAME] lets each side enter a secret limit. Both phones show only "Deal at Rp 5.2M" or "No deal". Matching runs in an OutLayer TEE on NEAR; payment sits in an escrow contract. Built at NEAR HACKATHON @NEARProtocol #NEARHackathon

(Count before posting, trim "Rp" if over 280. Attach the video. Add @NearLegion @NearBuilders in the thread if room is short.)

**Thread:**
1. "How it works: limits are encrypted in the browser to a key held inside the TEE. The public, hash-pinned code returns only matched and price. NEAR holds ciphertext and a commitment hash." 
2. "Accounts are walletless: the browser makes a key and a relayer creates a testnet account. Escrow releases on 'Received', refunds after the deadline, no admin key. Repo: [TBD: URL]. Demo: [TBD: URL]." 
3. "We're testing with students in campus buy-and-sell groups: [TBD: N] real deals so far. Question for people who sell used things: would you send a link like this instead of quoting a price? @NearLegion @NearBuilders"

## 3. Submission write-up

**"What did you build?" (about 1200 chars):**

Haggling punishes whoever names a number first. A student selling a used laptop says Rp 5M, the buyer would have paid 5.5M, and neither ever finds out. People abandon deals both sides wanted because neither will show a limit.

[NAME] fixes the first step. The seller creates a deal and sends one link (one buyer per link). Each side types a maximum or minimum price in Rupiah. The number is encrypted in the browser to a key that exists only inside a TEE. When both are in, the escrow contract calls OutLayer, where public, hash-pinned WASM checks the overlap and, if there is one, draws a random price inside it. Both phones show only "Deal at Rp X" or "No deal". A random price inside the overlap, not the midpoint, so the price does not reveal the other side's limit.

If the first round fails, the seller's chosen 1 to 3 rounds let both sides adjust: buyers can only raise, sellers only lower, checked in the TEE. Each round reveals one bit.

On NEAR: a Rust contract holds the encrypted limits and commitment hashes, calls OutLayer, and runs escrow (pay in, "Received" releases, refund after deadline, no admin key). Accounts are walletless: a browser key and a relayer-created testnet account. Testnet only. Stated limits: OutLayer is centralised today, and the match bit leaks a little information.

**README-ready version**

*Overview.* Same text as above, followed by "do X, see Y" steps: `npm run demo:seed`, open the hosted demo, [TBD: exact steps and URLs].

*Track: Privacy.* Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret. The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned, and returns only `{matched, price}`. The relayer never sees plaintext and stores no deal data. Contract state shows ciphertext and `sha256(limit, salt)` commitments, so a result can be audited when an owner chooses to reveal. [TBD: "Verified" panel with fresh nonce, only if it ships.] Stated limits: OutLayer governance is centralised; the match bit and price leak some information; users trust the served frontend.

*Track: Agents or real-world.* [TBD: choose at freeze 11-13.] If the AI negotiator ships, tag agents: NEAR AI Cloud turns "not below 4M, charger included" into numbers through E2EE chat completions, and a deterministic rule in the WASM, never the model, decides money. If not, tag realworld: [TBD: N] real student deals, paid, pending and refunded states, transaction links, README readable without crypto knowledge.

*Disclosure.* Libraries and AI-written code: [TBD: list]. Baseline code before 2026-10-19: [TBD: none or list].

## 4. Two-minute pitch (about 270 words)

"Picture a student selling a used laptop in a campus group. She asks 5 million rupiah. The buyer would have paid 5.5. Neither says it, the buyer offers 4, she says no, and both go home without a deal they wanted.

[NAME] removes the first number. She makes a deal and sends one link. He opens it with no wallet and no seed phrase. Each types a real limit. Both phones show the same answer at the same moment: either 'Deal at Rp 5.2 million' or 'No deal'. Nothing else. Not her minimum, not his maximum.

How can that be private? Each number is encrypted on the phone to a key that lives inside a TEE on NEAR's OutLayer. The matching code is public and hash-pinned, and it returns only match and price. On-chain you see ciphertext and a hash. The price is random inside the overlap, so it can't be used to back out the other side's limit.

If it fails, the seller can allow up to three rounds. Buyers can only go up, sellers can only go down, and each round reveals one bit. A deal is binding and ends the game, so probing costs you.

When there's a deal, the buyer pays into an escrow contract. 'Received' pays the seller. No delivery means a refund. No admin key exists.

Honest limits: OutLayer is still centralised, and no negotiation method is fully fair, truthful and always finds a deal. We trade some deals for privacy.

We're running it with students: [TBD: N deals, N that would not have started]. Try it: [TBD: URL]."

## 5. Judge Q&A

1. **Isn't this just a sealed-bid auction?** It is a double-sided sealed negotiation: one seller, one buyer, both limits hidden, price set inside the overlap. An auction needs many bidders; a campus sale usually has one.
2. **What stops probing across rounds?** Rounds are capped at 3, chosen by the seller. Limits can only move one way. A deal is binding, so it is the one-egg version of the egg-drop problem. Leak is at most 1 bit per round. Laddering (start low, step up) is possible and is ordinary haggling done privately; the seller never gets below their minimum.
3. **Why trust OutLayer?** You trust Intel TDX plus OutLayer's operation. We reduce that: code is public and hash-pinned, the relayer sees only ciphertext, and results arrive by callback from `outlayer.testnet` only. Governance is centralised today, and we say so. [TBD: enclave-signed results, if they ship.]
4. **Why not just haggle?** Anchoring and pressure favour the stronger side, such as a dealer against a student. Haggling also fails when neither will name a number. Private rounds keep a way to meet in the middle.
5. **How is this different from Penstock?** Penstock is an x402 payment rail for APIs, with no own contract per COMPETITORS.md. We settle a human deal, and our core is a contract plus TEE matching. Different job, different user.
6. **How is this different from Warrant?** Warrant is DeFi options with collateral in intents.near. We hold no market and no derivative; escrow is a side feature to a private match. [TBD: our fee story is a hypothesis.]
7. **Who pays when a buyer never pays?** No one, and we do not hide it. A matched buyer cannot be forced to pay; `expire` frees the deal after 24 h. A bond sized to the limit would leak it, so none is used. A fixed bond is a possible later addition.
8. **What about Myerson-Satterthwaite?** It says no mechanism is efficient, truthful and budget-balanced at once. We give up some efficiency (some deals are missed) and rely on binding deals to discourage lying. Stated in the README.
9. **Why NEAR?** Walletless accounts via sub-accounts and function-call keys keep the chain invisible. Contract-to-TEE calls through OutLayer are native. Escrow needs no custom chain. Testnet is free for 10-20 real deals.
10. **What leaks?** The match bit, and the price: you learn the other limit lies beyond the price. Not the number.
11. **Money is testnet. Does this matter?** Escrow logic and flows are real; funds are not. Fixed demo rate, `rp_per_near` set at init. Mainnet and oracle: out of scope. [TBD: sustainability, candidate is a small fee on escrowed deals.]
12. **What if the page you serve is malicious?** Users trust the frontend; it is open source and self-hostable. This is a stated limit.

## 6. Live demo plan

- **Seeded pair:** `npm run demo:seed` creates one matched deal (seller 5.0M, buyer 5.5M) and one unmatched deal. Judges need no second device; a split-screen page plays both roles.
- **Happy path:** open matched deal, both Confirm, reveal, Pay, Received, PAID. [TBD: rehearsed run time, aim under 90 s.]
- **No-deal path:** open unmatched deal, show "No deal", then round 2.
- **Fallback:** a recorded run of the same path (the demo video). If testnet or OutLayer is down, play it and say so.
- **One-click reset:** a "Reset demo" button re-runs the seed. [TBD: confirm it exists in the build.]
- **Before going live:** fund the relayer, check the seed deals' state, keep the hosted demo up to 11-18, ideally 11-25.

## 7. Real-user plan (10-20 deals by 2026-11-13)

- **Recruit:** the team posts in campus buy-and-sell groups [TBD: which groups]; offer to run a testnet deal for items people are already selling. Aim to start 11-12, one team member on call per deal.
- **Consent wording:** "This is a hackathon test. Prices stay private; money is test money. We record only the outcome (deal or not, rounds used, time to deal). We may quote one line from you only if you say yes. You can stop any time."
- **Log (anonymised):** outcome, rounds used, time to deal, item category, whether the deal would likely have failed to start (user's own answer), and one-line quote with a yes/no permission flag. No names, no limits.
- **Present:** headline "[TBD: N] deals, [TBD: N] that would have failed to start" (the PRD metric), median time to deal, rounds used. Say it is a small sample with testnet money. Use only quotes with permission.


## TODO from red-team
- Add a sustainability answer to the Q&A: 0.5% fee on settled deals; buy-and-sell groups and marketplaces embed the deal link.
- Default tracks are privacy + realworld; replace `agents-or-realworld` wording once S-02's fate is known.
