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

## Grill: the 5 hardest questions (answers needed at the gate)

1. **Presence spoofing.** A photo of a QR code lets anyone "visit" from home. Do we buy NTAG 424 DNA NFC tags, which produce a unique signed code per tap (are they available in your city within 2 days?), or accept QR plus GPS plus rate limits and state the limit honestly?
2. **Real session.** Can the team run a 1-2 hour play session on campus (or at an event) on 12 or 13 Nov with 20+ players? Who recruits them? Is putting stickers up allowed, or do we need indoor or private walls?
3. **Real money or not.** Testnet NEAR makes the game free but the "economy" is play money. Should a tiny mainnet season (e.g., the team seeds 5 NEAR into the pot) be the stretch goal?
4. **Fun.** Harberger pricing is clever, but is it fun in 30 seconds? What does a first-time player do in their first minute besides "buy"? I'd add a free "visit" tap that earns explorer points toward the pot.
5. **Fallback.** If the physical session fails (rain, turnout), the demo falls back to a recorded indoor session plus a simulated "week in a minute" replay, as the games prompt suggests. Is that acceptable to you?
