# Packaging: [NAME]

Draft 2026-11-12. Binding sources: PRD, marketplace pivot design (docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md, 2026-11-12), IDEAS (Blind deal), DECISIONS, RECON 1/4/5, HACKATHON "2. The demo post". Demo numbers (seller minimum 5.0M, buyer offer 5.5M, deal 5.2M) are seed values, [TBD: confirm in `demo:seed`]. Anything unverified is `[TBD: ...]`.

## 1. Demo video script (target 2:10, captions on)

| Time | Shot | On-screen | Voiceover |
|---|---|---|---|
| 0:00-0:08 | Instagram profile of a student seller, thumb taps the bio link `/@handle`. Shop opens with photos and asking prices | "Seller wants 5M. Buyer would pay 5.5M. Neither says so." | "Whoever names a number first loses. So people walk away from deals both of them wanted. This seller put her shop in her bio. Every item shows a photo and an asking price. How low she'd really go stays sealed." |
| 0:08-0:20 | Tap a laptop listing. Type "Is the charger included?" in the assistant. Answer appears. Type "What's the lowest price?" and the assistant declines | "Ask the assistant" then "Offers used: 3 of 10" | "Buyers can ask an AI assistant about the item. It answers from the listing and from public questions, and it never sees the price. If it doesn't know, the question goes to the seller and her answer is public." |
| 0:20-0:35 | Buyer signs in with Google, types a maximum, taps Confirm. Seller's phone shows the listing was sealed earlier | "No wallet. No seed phrase." | "The seller sealed her minimum once, when she listed the laptop. The buyer signs in with Google and types the most he would pay. The chain is behind the sign-in." |
| 0:35-1:00 | Animation: number encrypted on the phone, arrow to a sealed box | "Encrypted on your phone". "Runs in a TEE on OutLayer" | "Each limit is encrypted before it leaves the phone. Only code running in a secure enclave can open it, and that code is public and hash-pinned. We can't read your number either." |
| 1:00-1:15 | Reveal on the buyer's phone. Verified panel with nonce; explorer showing ciphertext and commitment hash | Reveal: "Deal at Rp 5,200,000". "Attested code hash". "On-chain: ciphertext + commitment" | "He sees one answer: a deal at 5.2 million. A fresh attestation shows which code ran. On NEAR you can see only ciphertext and a hash, never the number." [TBD: show the panel only if it ships] |
| 1:15-1:35 | Listing flips to Reserved. Buyer pays into escrow. Chat opens. Item handed over. Buyer taps Received. Listing shows Sold | "RESERVED" then "PAID" then "SOLD" | "A match reserves the item and the buyer pays into escrow. Chat opens only now, after the deal. When the item arrives, he taps Received and the seller is paid. If it never arrives, he gets a refund. There is no admin key." |
| 1:35-1:55 | Unmatched offer: "No deal", then "Round 2 of 2", buyer raises | "Seller picks 1 to 3 rounds" | "If there's no deal, the buyer can try again. He can only raise. Each round reveals only deal or no deal." |
| 1:55-2:05 | Plain text card | "Limit: the enclave operator, OutLayer, is still centralised. We say so in the README." | "One honest limit: OutLayer is not yet fully decentralised, and you trust it to run the public code." |
| 2:05-2:10 | Logo, repo URL, demo URL | "[NAME]. Built at NEAR HACKATHON" | "[NAME]. Put your shop in your bio." |

## 2. X demo post

**Main (about 260 chars):**
> Selling a laptop: you want 5M, they'd pay 5.5M, nobody finds out. On [NAME], sellers seal a minimum and buyers make blind offers. You see only "Deal at Rp 5.2M" or "No deal". Matching runs in an OutLayer TEE; payment sits in NEAR escrow. @NEARProtocol #NEARHackathon

(Count before posting, trim "Rp" if over 280. Attach the video. Add @NearLegion @NearBuilders in the thread if room is short.)

**Thread:**
1. "How it works: the seller puts a shop link in their bio. Listings show an asking price; the seller's real floor stays sealed. Offers are encrypted in the browser to a key held inside the TEE. The public, hash-pinned code returns only matched and price. NEAR holds ciphertext and a commitment hash."
2. "Sign in with Google or email. A relayer makes the NEAR account behind it, so there is no wallet and no seed phrase. An AI assistant answers item questions and never sees the seller's floor. Escrow releases on 'Received', refunds after the deadline, no admin key. Repo: [TBD: URL]. Demo: [TBD: URL]."
3. "We're testing with students who sell second-hand things: [TBD: N] real deals so far. Question for people who sell used items: would you put a shop link like this in your bio instead of haggling in DMs? @NearLegion @NearBuilders"

## 3. Submission write-up

**"What did you build?" (about 1200 chars):**

Haggling punishes whoever names a number first. A student selling a used laptop says Rp 5M, the buyer would have paid 5.5M, and neither ever finds out. People abandon deals both sides wanted because neither will show a limit.

[NAME] is a second-hand marketplace where the seller's real floor stays blind. The seller puts a shop link (/@handle) in their Instagram or marketplace bio. Buyers browse listings with photos and asking prices. An AI assistant answers questions from the listing and public Q&A and never sees the seller's floor. Questions it can't answer go to the seller as public Q&A.

The seller seals a minimum once per listing. A buyer makes a blind offer, up to 10 offers per listing. Both numbers are encrypted in the browser to a key that exists only inside a TEE. Public, hash-pinned WASM on OutLayer checks the overlap and, if there is one, draws a random price inside it. Both sides see only "Deal at Rp X" or "No deal". The seller picks 1 to 3 rounds. Buyers can only raise.

A match reserves the item. The buyer pays into a NEAR escrow contract and chat opens. "Received" releases the funds and marks the item Sold. Sign-in is Google or email, with a NEAR account made behind it, or an existing NEAR wallet. Testnet only. Stated limits: OutLayer is centralised today, and the match bit leaks a little information.

**README-ready version**

*Overview.* Same text as above, followed by "do X, see Y" steps: `npm run demo:seed`, open the hosted demo, [TBD: exact steps and URLs].

*Track: Privacy.* Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret. The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned, and returns only `{matched, price}`. The relayer and the AI assistant never see a minimum or an offer. Contract state shows ciphertext and `sha256` commitments, so a result can be audited when an owner chooses to reveal. [TBD: "Verified" panel with fresh nonce, only if it ships.] Stated limits: OutLayer governance is centralised; the match bit and price leak some information; users trust the served frontend.

*Track: Agents.* The product assistant runs on NEAR AI Cloud through the relayer. It answers from the listing text and public Q&A, never discusses price or offers, and says so when it does not know. It is never given the sealed minimum, because nothing on the server holds it. Unanswered questions become public Q&A for the seller. If the AI negotiator ships, NEAR AI Cloud also turns "not below 4M, charger included" into numbers, and a deterministic rule in the WASM, never the model, decides money. [TBD: tag agents only if the team confirms at submission.]

*Track: Real-world.* Escrowed payments between real sellers and buyers: [TBD: N] real student deals, reserved, paid, sold and refunded states, transaction links, README readable without crypto knowledge. [TBD: final track list is the team's call at submission.]

*Disclosure.* Libraries and AI-written code: [TBD: list]. Baseline code before 2026-10-19: [TBD: none or list].

## 4. Two-minute pitch (about 270 words)

"Picture a student selling a used laptop. She asks 5 million rupiah. The buyer would have paid 5.5. Neither says it, the buyer offers 4, she says no, and both go home without a deal they wanted.

[NAME] removes the haggle. She puts her shop link in her Instagram bio. Buyers find her items with photos and asking prices. An AI assistant answers their questions about the item. It never sees her floor. If it doesn't know, the question goes to her and the answer becomes public.

She sealed her minimum once. He signs in with Google and types the most he would pay. Both phones show one answer: 'Deal at Rp 5.2 million' or 'No deal'. Nothing else.

How can that be private? Each number is encrypted on the phone to a key inside a TEE on NEAR's OutLayer. The matching code is public and hash-pinned, and it returns only match and price. On-chain you see ciphertext and a hash. The price is random inside the overlap, so it can't back out the other limit.

If it fails, he can raise, up to three rounds. Each round reveals one bit. A match is binding and reserves the item, so probing costs you.

He pays into an escrow contract. Chat opens only after the deal. 'Received' pays her and marks the item Sold. No delivery means a refund. No admin key exists.

Honest limits: OutLayer is still centralised, and no negotiation method is fully fair, truthful and always finds a deal. We trade some deals for privacy.

We're running it with students: [TBD: N deals, N that would not have started]. Try it: [TBD: URL]."

## 5. Judge Q&A

1. **Isn't this just a sealed-bid auction?** It is a double-sided sealed negotiation: a sealed seller minimum, a hidden buyer maximum, and a price set inside the overlap. An auction picks the highest of many bids. Here each buyer is matched against the minimum on their own.
2. **What stops probing across rounds and offers?** Rounds are capped at 3, chosen by the seller. A buyer can only raise. Offers are capped at 10 per listing. A match is binding and reserves the item, so it is the one-egg version of the egg-drop problem. Each account learns at most 1 bit per round. Laddering (start low, step up) is possible and is ordinary haggling done privately; the seller never gets below their minimum.
3. **Why trust OutLayer?** You trust Intel TDX plus OutLayer's operation. We reduce that: code is public and hash-pinned, the relayer sees only ciphertext, and results arrive by callback from `outlayer.testnet` only. Governance is centralised today, and we say so. [TBD: enclave-signed results, if they ship.]
4. **Why not just haggle?** Anchoring and pressure favour the stronger side, such as a dealer against a student. Haggling also fails when neither will name a number. Private rounds keep a way to meet in the middle.
5. **How is this different from Penstock?** Penstock is an x402 payment rail for APIs, with no own contract per COMPETITORS.md. We settle a human sale, and our core is a contract plus TEE matching. Different job, different user.
6. **How is this different from Warrant?** Warrant is DeFi options with collateral in intents.near. We hold no market and no derivative; escrow is a side feature to a private match.
7. **Who pays when a buyer never pays?** No one, and we do not hide it. A matched buyer cannot be forced to pay; `expire` frees the deal and reopens the listing. A bond sized to the limit would leak it, so none is used. A fixed bond is a possible later addition.
8. **What about Myerson-Satterthwaite?** It says no mechanism is efficient, truthful and budget-balanced at once. We give up some efficiency (some deals are missed) and rely on binding deals to discourage lying. Stated in the README.
9. **Why NEAR?** Accounts made behind a Google or email sign-in keep the chain invisible. Contract-to-TEE calls through OutLayer are native. Escrow needs no custom chain. Testnet is free for 10-20 real deals.
10. **What leaks?** The match bit, and the price: you learn the other limit lies beyond the price. Not the number.
11. **Money is testnet. Does this matter?** Escrow logic and flows are real; funds are not. Fixed demo rate, `rp_per_near` set at init. Mainnet and oracle: out of scope.
12. **What if the page you serve is malicious?** Users trust the frontend; it is open source and self-hostable. This is a stated limit.
13. **Does the AI assistant know the seller's minimum?** No. The relayer gives it only the listing text and public Q&A. The minimum is sealed to the TEE, so nothing on the server has it. The assistant is told never to discuss price or offers.
14. **How does it make money?** A small fee on escrowed sales, around 0.5%. This is a hypothesis we have not tested. Sellers who list in their bio bring their own buyers, and marketplaces and buy-and-sell groups can link to a shop.
15. **Why can't buyers chat before a deal?** Free chat invites people to type prices, which undoes the blind offer. Before a deal, buyers ask the assistant or post a public question. Chat opens after a match, between those two people only.

## 6. Live demo plan

- **Seeded shop:** `npm run demo:seed` creates a demo shop `/@handle` with several listings (the team's own photos), one matched deal (seller minimum 5.0M, buyer 5.5M) and one unmatched offer. Judges need no second device. [TBD: handle and listing count.]
- **Happy path:** open the shop from the bio link, open a listing, ask the assistant a question, make the blind offer, reveal, Reserved, Pay, chat, Received, Sold. [TBD: rehearsed run time, aim under 90 s.]
- **No-deal path:** open the unmatched listing, show "No deal", then round 2.
- **Fallback:** a recorded run of the same path (the demo video). If testnet, OutLayer or the assistant is down, play it and say so.
- **One-click reset:** a "Reset demo" button re-runs the seed. [TBD: confirm it exists in the build.]
- **Before going live:** fund the relayer, check the seed listings' state, keep the hosted demo up to 11-18, ideally 11-25.

## 7. Real-user plan (10-20 deals by 2026-11-13)

- **Recruit:** the team posts in campus buy-and-sell groups [TBD: which groups]; offer to list items people are already selling and run a testnet deal for each. Sellers put their shop link in their bio or group post. Aim to start 11-12, one team member on call per deal.
- **Consent wording:** "This is a hackathon test. Prices stay private; money is test money. We record only the outcome (deal or not, rounds used, time to deal). We may quote one line from you only if you say yes. You can stop any time."
- **Log (anonymised):** outcome, rounds used, offers used, time to deal, item category, whether the deal would likely have failed to start (user's own answer), and one-line quote with a yes/no permission flag. No names, no limits.
- **Present:** headline "[TBD: N] deals, [TBD: N] that would have failed to start" (the PRD metric), median time to deal, rounds used. Say it is a small sample with testnet money. Use only quotes with permission.

## TODO
- Tracks proposed: privacy, agents (product assistant first, negotiator only if it ships) and realworld. Final list is the team's call at submission.
- Sustainability: 0.5% fee on settled sales is a hypothesis. Confirm the number before the pitch.
