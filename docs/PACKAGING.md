# Packaging: Shake

Draft 2026-11-12, updated 2026-11-13 for the name Shake (#42), the asking price and the buyer cap. Binding sources: PRD, marketplace pivot design (docs/superpowers/specs/2026-11-12-marketplace-pivot-design.md, 2026-11-12), IDEAS, DECISIONS, RECON 1/4/5, HACKATHON "2. The demo post". Demo numbers (asking price 6.0M, seller minimum 5.0M, buyer offer 5.5M, deal 5.2M) are seed values; a buyer can offer at most the asking price, so the asking price must be at least the buyer's number; [TBD: confirm in `demo:seed`]. Anything unverified is `[TBD: ...]`.

## 1. Demo video script (target 2:10, captions on)

**Out of date, rewritten in P-02 (target 90 s or less):** the 0:20 row ("signs in with Google", "No wallet. No seed phrase.") and the 1:00 row ("Verified panel with nonce", "Attested code hash") describe things the app no longer does or never built. Use section 2 to 4 for the current wording.

| Time | Shot | On-screen | Voiceover |
|---|---|---|---|
| 0:00-0:08 | Instagram profile of a student seller, thumb taps the bio link `/@handle`. Shop opens with photos and asking prices | "Asking Rp 6M. She'd take 5M. He'd pay 5.5M. Neither says so." | "Whoever names a number first loses. So people walk away from deals both of them wanted. This seller put her shop in her bio. Every item shows a photo and an asking price. How low she'd really go stays sealed." |
| 0:08-0:20 | Tap a laptop listing. Type "Is the charger included?" in the assistant. Answer appears. Type "What's the lowest price?" and the assistant declines | "Ask the assistant" then "Offers used: 3 of 10" | "Buyers can ask an AI assistant about the item. It answers from the listing and from public questions, and it never sees her floor. If it doesn't know, the question goes to the seller and her answer is public." |
| 0:20-0:35 | Buyer signs in with Google, types a maximum, taps Confirm. Seller's phone shows the listing was sealed earlier | "No wallet. No seed phrase." | "The seller sealed her minimum once, when she listed the laptop. The buyer signs in with Google and types the most he would pay, up to her asking price. The chain is behind the sign-in." |
| 0:35-1:00 | Animation: number encrypted on the phone, arrow to a sealed box | "Encrypted on your phone". "Runs in a TEE on OutLayer" | "Each limit is encrypted before it leaves the phone. Only code running in a secure enclave can open it, and that code is public and hash-pinned. We can't read your number either." |
| 1:00-1:15 | Reveal on the buyer's phone. Verified panel with nonce; explorer showing ciphertext and commitment hash | Reveal: "Deal at Rp 5,200,000". "Attested code hash". "On-chain: ciphertext + commitment" | "He sees one answer: a deal at 5.2 million. A fresh attestation shows which code ran. On NEAR you can see only ciphertext and a hash, never the number." [TBD: show the panel only if it ships] |
| 1:15-1:35 | Listing flips to Reserved. Buyer pays into escrow. Chat opens. Item handed over. Buyer taps Received. Listing shows Sold | "RESERVED" then "PAID" then "SOLD" | "A match reserves the item and the buyer pays into escrow. Chat opens only now, after the deal. When the item arrives, he taps Received and the seller is paid. If it never arrives, he gets a refund. There is no admin key." |
| 1:35-1:55 | Unmatched offer: "No deal", then "Round 2 of 2", buyer raises | "Seller picks 1 to 3 rounds" | "If there's no deal, the buyer can try again. He can only raise. Each round reveals only deal or no deal." |
| 1:55-2:05 | Plain text card | "Limit: the enclave operator, OutLayer, is still centralised. We say so in the README." | "One honest limit: OutLayer is not yet fully decentralised, and you trust it to run the public code." |
| 2:05-2:10 | Logo, repo URL, demo URL | "Shake. Built at NEAR HACKATHON" | "Shake. Put your shop in your bio." |

## 2. X demo post

Draft for team approval (P-03, 2026-11-13 20:30 UTC). Checked against the app as merged on `dev`: Google or email browses and asks; selling and offering need a NEAR wallet; the proof panel checks the buyer's own offer, not the enclave. Posting needs the whole team (CLAUDE.md).

**Main (counted: see the note under it):**
> Selling a used laptop: she'd take 5M, he'd pay 5.5M, neither says it. On Shake the seller seals a floor, buyers make blind offers, and both see only "Deal at Rp 5.2M" or "No deal". Matching runs in an OutLayer TEE; payment waits in NEAR escrow. @NEARProtocol #NEARHackathon

(Count again after any edit; X's limit is 280. Attach the video. Built at NEAR HACKATHON goes in the video's end card.)

**Thread:**
1. "How it works: a seller puts one shop link in their bio. Every listing shows an asking price; the seller's real floor stays sealed. Offers are encrypted on the buyer's phone to a key that only exists inside the TEE. Public, hash-pinned code returns deal or no deal, and a price."
2. "Browse and ask with Google or email. To sell or make an offer you connect a NEAR wallet, so every offer is signed by its owner and the app holds nobody's keys or money. Escrow releases on 'Received'; nothing arrives in 7 days, the buyer takes it back. No admin key."
3. "Each buyer can check on their own phone that the sealed offer on the chain is exactly the one they sent. An AI assistant on NEAR AI Cloud answers questions about the item and never sees anyone's limit. Honest limit: OutLayer runs the enclave centrally today."
4. "Repo: https://github.com/ketutezraugm/shake · Demo: https://shake-app.onrender.com/welcome · Testnet only. Question for anyone who sells used things: would you put a shop link like this in your bio instead of haggling in DMs? @NearLegion @NearBuilders"

Cut from the old draft: "no wallet and no seed phrase" (wrong since 2026-11-13: a Google login no longer gets a NEAR account), and the real-deals count (no deals are logged yet; add "[N] real deals so far" to tweet 4 only if S-08 logs some).

## 3. Submission write-up

**`idea` field (the form's "What did you build?", 1742 of 2,000 characters, final 2026-11-14; it must say how NEAR fits in):**

Haggling punishes whoever names a number first. A student selling a used laptop would take Rp 5M, the buyer would have paid 5.5M, and neither finds out. People walk away from deals both wanted because neither will show a limit.

Shake is a second-hand marketplace where both limits stay blind. A seller puts one shop link (/@handle) in their Instagram or marketplace bio. Buyers browse listings with photos and an asking price, ask an AI assistant about the item, or post a public question the seller answers.

The seller seals a lowest price once per listing. A buyer makes a blind offer of at most the asking price. Both numbers are encrypted in the browser to a key that exists only inside a TEE. Public, hash-pinned WASM on OutLayer checks the overlap and, if there is one, draws a random price inside it. Each side sees only "Deal at Rp X" or "No deal". The seller picks 1 to 3 rounds, and a buyer can only raise.

How NEAR fits in: our Rust contract holds the sealed ciphertexts, commitments, deal state and the escrowed money; OutLayer runs the matcher in a TEE and calls back into that contract; every offer is signed by the buyer's own NEAR wallet; the assistant runs on NEAR AI Cloud and never sees a limit. A match reserves the item, the buyer pays into escrow, and "Received" pays the seller; if nothing arrives in 7 days the buyer takes the money back.

Live on NEAR testnet, no real money: https://shake-app.onrender.com/welcome. Two wallets completed the whole flow on it, and the demo shop @demo holds a finished sale with receipts and chat. Stated limits: OutLayer is operated centrally today, each round reveals one bit (deal or no deal), and its runs sometimes fail; the contract then returns the round and the app says so.

**README-ready version**

*Overview.* The text above, then the README's "Try it" steps (local, no keys) and the hosted demo: https://shake-app.onrender.com/welcome (repo: https://github.com/ketutezraugm/shake).

*Track: Privacy.* Limits are encrypted in the browser to a key derived inside the TEE from a `PROTECTED_` secret. The WASM runs in Intel TDX on `outlayer.testnet`, is public and hash-pinned (`789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904`), and returns only `{deal_id, matched, price}`; the key opens only for that build. The relayer and the AI assistant never see a lowest price or an offer. The chain holds ciphertexts and `sha256` commitments, and the buyer's proof panel recomputes each of their own commitments to show the sealed offer is the one they sent. Stated limits: OutLayer is operated centrally; nothing yet proves a result came from the pinned WASM (enclave-signed results are S-07, not built); each round leaks one bit; users trust the served frontend.

*Track: Agents.* The product assistant runs DeepSeek V4.1 Flash on NEAR AI Cloud through the relayer and answers from the listing text and public Q&A. It may repeat the public asking price, never discusses offers, discounts or the lowest price, and says when it does not know; unanswered questions go to the seller as public Q&A. It is never given a limit, because nothing on the server holds one. "Say it in words" (a buyer types "paling mahal 4,3 juta") is read on the phone by a fixed rule, not by the model, so it adds nothing to this track. [Decided 2026-11-14: agents is tagged, on the assistant alone.]

*Track: Real-world.* Escrowed payments between sellers and buyers on testnet: reserved, paid, sold, refunded and reopened states, receipts with transaction links, a bio-link shop, a seeded demo shop (`@demo`) with a finished sale, and a README a non-crypto person can follow. No count of real student deals is claimed.

*Disclosure.* Libraries: see `package.json` and `Cargo.toml`; the sealed-key approach follows OutLayer's `private-dao-example`. Baseline code before 2026-10-19: none (the first commit is 2026-11-09). AI use: [Team call, suggested wording] built by the four of us with AI coding assistance (Claude Code); the in-app product assistant runs on NEAR AI Cloud; the demo video's voiceover is generated with ElevenLabs.

## 4. Two-minute pitch (about 270 words)

"Picture a student selling a used laptop. She would take 5 million rupiah. The buyer would have paid 5.5. Neither says it, the buyer offers 4, she says no, and both go home without a deal they wanted.

Shake removes the haggle. She puts her shop link in her Instagram bio. Buyers find her items with photos and asking prices. An AI assistant answers their questions about the item; it never sees her floor. If it doesn't know, the question goes to her and the answer becomes public.

She sealed her lowest price once, when she listed. He connects his NEAR wallet and types the most he would pay. Both phones show one answer: 'Deal at Rp 5.2 million', or 'No deal'. Nothing else.

How is that private? Each number is encrypted on the phone to a key inside a TEE on NEAR's OutLayer. The matching code is public and hash-pinned, and it returns only match and price. On the chain you see ciphertext and a hash, and his phone can check that the sealed offer is exactly the one he sent. The price is random inside the overlap, so nobody can back out the other limit.

No deal? He can raise, up to three rounds. Each round reveals one bit, and a match is binding and reserves the item, so probing costs you.

He pays into escrow and chat opens. 'Received' pays her and marks it Sold. Nothing arrives in seven days, he takes his money back. There is no admin key.

Honest limits: OutLayer is still run centrally, and no negotiation method is fair, truthful and always finds a deal. We trade some deals for privacy.

Try it: shake-app.onrender.com/welcome."

## 5. Judge Q&A

1. **Isn't this just a sealed-bid auction?** It is a double-sided sealed negotiation: a sealed seller minimum, a hidden buyer maximum, and a price set inside the overlap. An auction picks the highest of many bids. Here each buyer is matched against the minimum on their own.
2. **What stops probing across rounds and offers?** Rounds are capped at 3, chosen by the seller. A buyer can only raise. Offers are capped at 10 per listing. A match is binding and reserves the item, so it is the one-egg version of the egg-drop problem. Each account learns at most 1 bit per round. Laddering (start low, step up) is possible and is ordinary haggling done privately; the seller never gets below their minimum.
3. **Why trust OutLayer?** You trust Intel TDX plus OutLayer's operation. We reduce that: code is public and hash-pinned, the relayer sees only ciphertext, and results arrive by callback from `outlayer.testnet` only. Governance is centralised today, and we say so. [TBD: enclave-signed results, if they ship.]
4. **Why not just haggle?** Anchoring and pressure favour the stronger side, such as a dealer against a student. Haggling also fails when neither will name a number. Private rounds keep a way to meet in the middle.
5. **How is this different from Penstock?** Penstock is an x402 payment rail for APIs, with no own contract per COMPETITORS.md. We settle a human sale, and our core is a contract plus TEE matching. Different job, different user.
6. **How is this different from Warrant?** Warrant is DeFi options with collateral in intents.near. We hold no market and no derivative; escrow is a side feature to a private match.
7. **Who pays when a buyer never pays?** No one, and we do not hide it. A matched buyer cannot be forced to pay; `expire` frees the deal and reopens the listing. A bond sized to the limit would leak it, so none is used. A fixed bond is a possible later addition.
8. **What about Myerson-Satterthwaite?** It says no mechanism is efficient, truthful and budget-balanced at once. We give up some efficiency (some deals are missed) and rely on binding deals to discourage lying. Stated in the README.
9. **Why NEAR?** Wallet sign-in through NEAR Connect means people bring their own account and pay their own fees; the app holds no keys or money. Contract-to-TEE calls through OutLayer are native. Escrow needs no custom chain. Testnet is free for 10-20 real deals.
10. **What leaks?** The match bit, and the price: you learn the other limit lies beyond the price. Not the number.
11. **Money is testnet. Does this matter?** Escrow logic and flows are real; funds are not. Fixed demo rate, `rp_per_near` set at init. Mainnet and oracle: out of scope.
12. **What if the page you serve is malicious?** Users trust the frontend; it is open source and self-hostable. This is a stated limit.
13. **Does the AI assistant know the seller's minimum?** No. The relayer gives it only the listing text and public Q&A. The minimum is sealed to the TEE, so nothing on the server has it. The assistant may repeat the public asking price and is told never to discuss offers, discounts or the lowest price; the live checks fail on any other number.
14. **How does it make money?** A small fee on escrowed sales, around 0.5%. This is a hypothesis we have not tested. Sellers who list in their bio bring their own buyers, and marketplaces and buy-and-sell groups can link to a shop.
15. **Why can't buyers chat before a deal?** Free chat invites people to type prices, which undoes the blind offer. Before a deal, buyers ask the assistant or post a public question. Chat opens after a match, between those two people only.
16. **Is there anything like this in the hackathon?** In our 2026-11-13 scan of all 783 gallery entries we found sealed-bid projects (Sealwell for token auctions, VeilProcure and SealedChoice for tenders) and agent marketplaces, but none that sells a human second-hand item with both the seller's floor and the buyer's ceiling hidden, a price inside the overlap and escrow. Their bids are one-sided; ours are two-sided. [TBD: re-check on submission day.]

## 6. Live demo plan

- **Seeded shop:** [TBD: `npm run demo:seed` does not exist yet (MK-14); until it does, list the seed items from `seed/` by hand.] A demo shop `/@handle` with several listings (the team's own photos), one matched deal (seller minimum 5.0M, buyer 5.5M) and one unmatched offer. Judges need no second device. [TBD: handle and listing count.]
- **Happy path:** open the shop from the bio link, open a listing, ask the assistant a question, make the blind offer, reveal, Reserved, Pay, chat, Received, Sold. [TBD: rehearsed run time, aim under 90 s.]
- **No-deal path:** open the unmatched listing, show "No deal", then round 2.
- **Fallback:** a recorded run of the same path (the demo video). If testnet, OutLayer or the assistant is down, play it and say so.
- **One-click reset:** a "Reset demo" button re-runs the seed. [TBD: confirm it exists in the build.]
- **Before going live:** check the hosted relayer's env (contract id, NEAR AI key), check the seed listings' state, keep the hosted demo up to 11-18, ideally 11-25.

## 7. Real-user plan (10-20 deals by 2026-11-13)

- **Recruit:** the team posts in campus buy-and-sell groups [TBD: which groups]; offer to list items people are already selling and run a testnet deal for each. Sellers put their shop link in their bio or group post. Aim to start 11-12, one team member on call per deal.
- **Consent wording:** "This is a hackathon test. Prices stay private; money is test money. We record only the outcome (deal or not, rounds used, time to deal). We may quote one line from you only if you say yes. You can stop any time."
- **Log (anonymised):** outcome, rounds used, offers used, time to deal, item category, whether the deal would likely have failed to start (user's own answer), and one-line quote with a yes/no permission flag. No names, no limits.
- **Present:** headline "[TBD: N] deals, [TBD: N] that would have failed to start" (the PRD metric), median time to deal, rounds used. Say it is a small sample with testnet money. Use only quotes with permission.

## TODO
- Tracks (decided by Ezra, 2026-11-14): `privacy`, `agents` and `realworld`; agents rests on the product assistant alone ("Say it in words" is not an AI).
- Sustainability: 0.5% fee on settled sales is a hypothesis. Confirm the number before the pitch.
