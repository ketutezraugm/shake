# Phase 2: Ideas

Inputs: COMPETITORS.md white space (games, nfts, social, memecoins; nobody has real users), judges (security, anti-hype, privacy), 5 days, 4 people (1 full-time designer), Rust contracts, testnet. Assumption from Ezra: only one prize per project, so we optimize for one track win and tag ~2 tracks that honestly fit.

## Long list (one line each)

1. **Hot potato coin**: a token that decays while you hold it and mints a bonus when passed to someone new; sent by link, the spread tree is the meme. (memecoins, social)
2. **Arisan circle**: Indonesian rotating savings with an on-chain "kocok" draw, guarantors for post-win defaults, portable reputation. (social, realworld). *Exists: Contri on NEAR, many on other chains.*
3. **Sticker territory game**: physical QR/NFC stickers around campus are NFTs with wallets; owners self-price them under a Harberger tax, anyone standing there can buy it out. (games, nfts)
4. **NPC night market**: players run stalls; AI shopper agents with wallets roam and buy; prices drift. (games, agents). *Crowded: Lantern Caravan, Bazaar Sovereign, DiveMarket.*
5. **Living items**: game items as sub-accounts that earn a cut of every trade they're in and level with use. (games, nfts)
6. **Party trading floor**: Jackbox-style 10-minute market game on phones, winnings persist across sessions. (games)
7. **Kas kelas**: class/club treasury with dues, auto-reminders, tiered spend approval on Sputnik. (social). *Close to Petty Cash.*
8. **Dare coin**: holders vote a daily dare; community jury confirms completion; confirmed dares mint supply. (memecoins, social)
9. **Group gift piggy bank**: an NFT piggy that is an account; friends chip in; it "breaks" into the gift at goal. (nfts, social)
10. **Habit stakes with friends as verifiers**: stake on yourself, friends attest, losses fund the group. (social)
11. **Private salary benchmark**: employees submit pay into a TEE, get percentiles without revealing data. (privacy)
12. **Agent reliability ledger**: agents' task outcomes logged on-chain as a public track record. (agents, security). *Near the guard cluster.*
13. **Clan loot splitter**: gaming guild DAO splitting tournament winnings by on-chain contribution. (social, games)
14. **Proof-of-visit passport**: event/venue stamps as NFTs that unlock perks. (nfts). *POAP-like, common.*
15. **Coin that only the crowd can unlock**: supply released when N distinct people co-sign within an hour. (memecoins)
16. **Hackathon-native prediction market** on which tracks win. (open). *Exists: Priced In.*

## Finalists

Scores 1-5. idea-reality (quick) is noisy: its keyword extraction is weak, so read "closest matches" rather than the signal.

| | Hot potato coin (1) | Arisan circle (2) | **Sticker territory (3)** | Living items (5) |
|---|---|---|---|---|
| Tracks | memecoins + social | social + realworld | games + nfts | games + nfts |
| Technical | 3 (linkdrop keys, decay math) | 4 (randomness, guarantors, Sputnik) | 4 (Harberger NFT contract, presence proof, walletless keys) | 4 |
| Design potential | 4 | 5 | 5 (map, physical objects, real people in video) | 4 |
| Impact | 2 | 5 | 3 | 2 |
| Originality vs field | 4 | 2 (Contri on NEAR) | 4 (TokenGo is location-based loot, not ownership) | 3 |
| Sustainability | 2 | 4 (fee per circle) | 3 (sponsorable spots, venues) | 2 |
| Magic moment | Link opens, potato lands, tree grows | Phone shake draws winner, pot lands | Tap a sticker on a pole: "you own this spot; 12 people paid it" | Sword shows what it earned |
| Real user pull this week | 5 | 3 (real money is hard; testnet feels fake) | 4 (one campus session = 20-30 players) | 2 |
| Judge fit | 2 (Haseeb dislikes coins) | 4 (Garg liability, Haseeb adoption) | 4 (Mert: replay-proof presence; Kain: UX; grand-prize "physical, non-obvious" pattern) | 3 |
| Demo risk | medium | low | medium (physical session) | high (fun is hard) |
| Team fit | ok | good | best (designer has a physical world to build) | ok |
| Track field (11-09) | memecoins 20, $BEFEWER strong | social 28, Petty Cash | games 28, TokenGo strong | games 28 |
| idea-reality | 12, no matches | 95, high; CircleUp (Stellar), JLImober/ROSCA | 13, no matches | n/a |

## Pick: Sticker territory game (working title only)

**Pitch.** Stickers on real walls around campus become pieces of a shared economy. Tap one with your phone, with no wallet and no app, and you can buy it at whatever price its owner has set. Owners pay a small continuous tax on their own price, so overpricing costs you and underpricing gets you bought out. The tax flows into a pot that pays the people who explore the most spots. Every spot is an NFT that is also an account: it holds money, keeps its history and changes hands on the street. The economy runs and rebalances itself with no admin.

**Magic moment.** Someone taps a sticker on a lamp post. In under two seconds the phone shows: "This spot is owned by @rani. She values it at 2 NEAR. 14 people have been here. Buy it?" They tap buy, the spot turns their color on the live map, and rani's phone buzzes.

**Why it beats the alternatives.** It has the best originality-to-buildability ratio, and it's the only finalist where real users and the demo video are the same event. A physical campus session gives us 20-30 real players, on-chain history and real footage, which no top competitor has.

**Why it beats the strongest competitors.** TokenGo hands out loot by GPS. We have ownership, prices and forced sales on objects people can touch, so the economy is the game. $BEFEWER and Warrant have deeper protocols but no players. Against the guard cluster, we're simply not in that category.

**Unfair advantage.** A full-time designer for a game whose whole identity is physical: stickers, map and video. On top of that, the team can be on campus with players this week.

**NEAR depth.** A Rust contract that holds the spots as NEP-171 NFTs with Harberger state (price, tax accrual, forced sale, pot). Walletless onboarding through function-call keys or linkdrop-style accounts. A relayer so gas never shows. A presence proof: each tap yields a server-signed or NFC-signed ticket that the contract verifies. Testnet first, with the option of a tiny mainnet season.

## How it works (draft rules)

**Player flow:** see sticker → scan with phone camera (web page, no app) → first time: type a name, playing in ~3 s → spot page shows owner, price, visits → **Visit** (free, 1 explorer point, once per spot per day) or **Buy** at the owner's price → new owner sets a new price, sees the daily tax → live map recolors, old owner gets notified.

**Economy (in-contract coins, not real money):**
- New player: 100 starter coins, only on a first scan at a real sticker, capped per device.
- Owner earns 2 coins per visit to their spot, so busy real places are worth more.
- Owner pays a daily tax on the price they set into the pot. Overpriced spots drain you; underpriced ones get bought out. Balance at 0 means the spot is foreclosed and goes back to unowned.
- Buyer pays the price to the old owner.
- Daily: pot split among explorers by points. Loop: owners → pot → explorers → buy spots.
- Season (e.g., the campus session plus a few days) ends with a leaderboard.

**Real money:** players never deposit. Optional end-of-season prize funded by us or a sponsor (e.g., the café whose door has a sticker). Sustainability story: venues sponsor spots and prize pots.

**Walletless:** the browser generates a key; our server creates `name.<game>.testnet` with a function-call key limited to the game contract and funds it with a little testnet NEAR for gas. No popups or fees. Function-call keys can't attach deposits, which is why coins are an internal ledger. Catch: the account lives in that browser; later, add export / connect-a-wallet.

## Grill: the 5 hardest questions (answers needed at the gate)

1. **Presence spoofing.** A photo of a QR code lets anyone "visit" from home. Do we buy NTAG 424 DNA NFC tags, which produce a unique signed code per tap (are they available in your city within 2 days?), or accept QR plus GPS plus rate limits and state the limit honestly?
2. **Real session.** Can the team run a 1-2 hour play session on campus (or at an event) on 12 or 13 Nov with 20+ players? Who recruits them? Is putting stickers up allowed, or do we need indoor or private walls?
3. **Real money or not.** Testnet NEAR makes the game free but the "economy" is play money. Should a tiny mainnet season (e.g., the team seeds 5 NEAR into the pot) be the stretch goal?
4. **Fun.** Harberger pricing is clever, but is it fun in 30 seconds? What does a first-time player do in their first minute besides "buy"? I'd add a free "visit" tap that earns explorer points toward the pot.
5. **Fallback.** If the physical session fails (rain, turnout), the demo falls back to a recorded indoor session plus a simulated "week in a minute" replay, as the games prompt suggests. Is that acceptable to you?

---

# Phase 2, round 2 (2026-11-09): new ideas, optimized only for win odds

Round 1 parked: the sticker / GPS territory game (fun, but heavy on physical logistics and a weaker money story).

## New long list (none from round 1)
1. **Blind deal**: buyer and seller each tell a private AI (inside a TEE) their real limit; a deal happens only if the ranges overlap, at the midpoint; nobody ever learns the other's number; payment settles on NEAR. (privacy, agents)
2. **Double-blind yes**: tell a TEE-hosted AI who you'd want as a cofounder / study partner / crush; only mutual matches are revealed. (privacy, social)
3. **Swarm clearing house**: LLM-free double auction where 20 buyer and 5 seller agents, each a NEAR sub-account, trade compute slots; live clearing page. Follows the swarms prompt to the letter. (swarms, agents)
4. **Evidence-grade thesis** with one original dataset and the best-designed dashboard in the track. (thesis)
5. **Secret ballot for Sputnik DAOs**: votes tallied in a TEE, only totals + attestation posted. (social, privacy)
6. **Verified-anonymous feedback**: prove you're in the class/org without revealing who you are. (privacy, social)
7. **Rent split by income, privately**: housemates' incomes go into a TEE, each sees only their fair share. (privacy, realworld)
8. **Assurance plans**: "futsal happens only if 10 commit"; deposits refunded plus a bonus if it fails (dominant assurance contract). (social)
9. **Agent track-record NFT**: an agent's verified job history as a sellable NFT-account. (nfts, agents)
10. **Group-buy swarm**: students' agents pool orders for bulk discounts. (swarms)
11. **Sealed-bid NFT auction in TEE**. (nfts, privacy)
12. **Proof-of-skill NFT from an AI interviewer in TEE**. (nfts, privacy)
13. **Private salary benchmark for interns**. (privacy)
14. **Memecoin minted only by mutual pairs** (two people must both confirm). (memecoins, social)
15. **Thesis prediction ledger**: thesis claims recorded on-chain and auto-scored over time. (thesis). *Exists: NEAR Books does this.*

Collision check (gallery names, 11-09): negotiation 0, matching/crush 0, voting 0, auction 1 (HiveBid), thesis 14 lookalikes ("NEAR on the evidence" x5), private/sealed 14 (mostly finance receipts and OTC).

## Finalists

| | **Blind deal (1)** | Double-blind yes (2) | Swarm clearing (3) | Evidence thesis (4) |
|---|---|---|---|---|
| Tracks | privacy + agents | privacy + social | swarms + agents | thesis |
| Field | privacy 68, zero negotiation entries | privacy 68, zero matching | swarms 32, quality unprofiled | thesis 33, 14 lookalikes, 4 credible |
| Technical | 4: NEAR AI Cloud private inference + attestation + escrow contract | 3 | 4: sub-accounts, auction contract, sim | 2 (data, no contract) |
| Design | 4 | 4 | 4 (live clearing page) | 5 (dashboard is the product) |
| Impact | 4: every second-hand sale, freelance rate, salary offer | 3 | 2 | 2 |
| Originality | 5 | 4 | 3 | 2 |
| Money theme | strong (prices, settlement) | weak | medium | medium |
| Real users this week | 4: campus buy/sell groups, real items | 5 | 1 (simulation by design) | 1 (not needed) |
| Judge fit | Illia (private AI), Garg (agents act for you), Haseeb (AI never moves money, a rule does) | Illia only | organizers' wishlist, but agent-market fatigue | VC judges, but "evidence not conviction" |
| Magic moment | Both press "Done"; screen says "Deal at Rp 4.2M. Neither of you will ever see the other's number." | "It's mutual." | Clearing price snaps into place | A chart nobody else has |
| Build risk (5 days) | medium (TEE attestation is new to us) | medium | medium | low |
| Podium odds (my estimate) | **30-40%** | 20-30% | 25-35% | 15-25% |
| Grand prize odds | **4-7%** | 2-4% | 1-3% | <2% |

## Pick: Blind deal (working title)

**Problem.** Haggling punishes whoever names a number first. A student selling a used laptop says Rp 5M, the buyer would have paid 5.5M, and nobody ever finds out. The same happens with freelance rates, salary offers and rent. People walk away from deals both of them wanted because neither will show their limit.

**Product.** A link both sides open. Each tells an AI negotiator their real limit and conditions in plain words ("not below 4M, I'll include the charger"). The AI runs inside a TEE on NEAR AI Cloud, so we, the operator, can't read it either, and the page shows a live attestation panel proving that. A deterministic rule, not the AI, decides: if the ranges overlap, the deal closes at the midpoint; if they don't, both get only "no deal" and nothing else leaks. On a deal, an escrow contract on NEAR holds the buyer's payment until the seller confirms handover.

**NEAR depth.** NEAR AI Cloud private inference with attestation verified in the UI (fresh nonce, per the privacy prompt), a Rust escrow contract with deal state, a commitment hash of each side's limit stored on-chain so results are auditable without revealing numbers, walletless accounts via function-call keys, and optional Intents so the buyer can pay from another chain.

**Why it beats the field.** It's the only negotiation entry among 373. It's money-native, unlike most privacy entries (receipts, OTC). And it keeps AI out of the money path, which answers Haseeb's "90% right is unusable" critique directly.

**Real users.** Campus buy-and-sell WhatsApp/Facebook groups: run 10-20 real deals (testnet escrow, real items, real prices) and log the outcomes. The number to show: "deals that would have failed to start".

**Risks.** TEE attestation setup is the unknown (verify NEAR AI Cloud attestation endpoint and which models run in TEE first, 2-3 h spike). Two-sided UX needs both people present. Fallback: commitments + deterministic matching work without the LLM, with the AI as a nice-to-have translator.
