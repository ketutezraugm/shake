# Design brief

For Abel and her Claude. **Abel owns every visual decision.** This brief separates what's fixed (what the product does, which screens and states exist, technical limits) from what's hers to decide (everything about how it looks and moves). Edit this file freely; it's a starting point, not a contract.

## How to use this
- **Fixed:** sections marked *Fixed* come from the product and the tech. Changing them changes what gets built, so tell the Frontend role first.
- **Starting point:** `docs/IDENTITY.md` (the marosok layout in security-tint blue and carbon-copy yellow) is where the team landed on 10 Nov. Keep it, bend it, or replace it. When something changes, update IDENTITY.md so Frontend builds the current version.
- **Avoid list:** `docs/PLAYBOOK.md` section 6 lists looks the research says judges have seen too often (dark neon crypto, cream-and-serif editorial, stock landing-page structures, library icons). Treat it as advice; override it when you have a reason.

## The product in 60 seconds *(Fixed; changed 2026-11-12 by the marketplace pivot)*
A second-hand marketplace where no listing shows a price. A seller puts their shop link (`/@handle`) in their Instagram or marketplace bio. Buyers land on the shop, open a listing (photos, details), ask an AI assistant about the item or ask the seller publicly, then make a blind offer: the seller sealed a minimum when listing, the buyer types a maximum, and a sealed machine (a TEE) compares them. On an overlap the deal closes at a random price inside it; otherwise the buyer sees "no deal" and learns nothing else. The seller picks 1-3 rounds per buyer; after a no-deal the buyer may only raise. A match reserves the item; the buyer pays into escrow; chat opens; the money releases when the buyer taps "Received" and the item shows Sold.

**Who and where:** people selling used things (students first), both non-crypto, on a phone, arriving from an Instagram or marketplace bio. Browsing is minutes; an offer is 1-3 minutes. Mistakes cost real money, so the number entry and the confirm step must be unmistakable. Second audience: judges on a laptop or projector, starting from the seeded shop `/@demo`.

## Screens and states *(Fixed: what exists; how each looks is Abel's call)*
Build order for Frontend: 1, 4, 3 first (task MK-30 in docs/plans/IMPLEMENTATION.md).
| # | Screen | Purpose | Must show | States |
|---|---|---|---|---|
| 1 | Home | Browse open listings | Grid of listing cards (photo, title, city, condition, "Blind offer" badge, no price), search, category filter | first visit, results, no results, loading |
| 2 | Sign in + handle | Google or email link, then pick a shop handle; NEAR account made behind it | Sign-in options, handle field | email sent, taken handle, creating account, error |
| 3 | Seller profile `/@handle` | The bio link destination | Avatar, name, bio, city, sold count, active listings (Reserved badge) | own profile (edit), visitor, not found, empty shop |
| 4 | Listing | Decide whether to offer | Up to 5 photos, title, details, seller card, "N of 10 offers used", AI assistant, public Q&A, "Make a blind offer" | Open, Reserved, Sold, Closed, offers full, own listing |
| 5 | AI assistant | Answer questions about this item | Question box, answer, "the seller didn't say" + "Ask the seller" | thinking, answer, unknown, rate-limited, error |
| 6 | Public Q&A | Questions and the seller's answers | Answered questions; seller sees unanswered with an answer field | none yet, pending (asker and seller only) |
| 7 | Create listing | Seller lists an item | Photos (up to 5), title, description, category, condition, city, rounds (1/2/3, default 2), sealed minimum with "only you see this" | empty, filled, uploading, sealing, submitting, error |
| 8 | Blind offer | Buyer sets a maximum privately | Item, Rupiah amount, round x of y, "only you see this", confirm step | empty, typing, invalid, confirm, encrypting, busy (retrying) |
| 9 | Reveal: deal | The magic moment | Deal price, "neither of you sees the other's number" | — |
| 10 | Reveal: no deal | Rounds left | "No deal this round", rounds left, raise | rounds left, final no deal |
| 11 | Pay + handover | Buyer funds escrow, then confirms | Price in Rp and test NEAR, pay; later "Received", deadline, refund note | paying, paid, released, refunded, expired |
| 12 | Chat | After a deal only | Messages between buyer and seller, the item | locked ("chat opens after a deal"), open, sending, error |
| 13 | Inbox | Seller and buyer activity | New questions, matches, payments, chats; badge count | empty, unread |
| 14 | Keys | Move the account to another device | Export key, import key | exported, imported, wrong key |
| 15 | Proof panel (Should) | Show why it's private | What the TEE proved, code hash, on-chain links | verified, unavailable |
| — | Global | | | offline, loading first paint, 404, very long titles, missing photo |

The reveal (9) is the one moment that should feel like an event. Everything else should get out of the way.

## Copy *(starting drafts; Abel and the team can rewrite)*
- Start: "Name your price without showing it."
- Enter limit (seller): "The lowest you'd accept. Only you will ever see this number."
- Enter limit (buyer): "The most you'd pay. Only you will ever see this number."
- Confirm: "Lock Rp 4.000.000? You can't change it this round."
- Listing badge: "Blind offer. No price here: make your offer privately."
- Assistant unknown: "The seller didn't mention that. Ask them? Their answer will show here for everyone."
- Chat locked: "Chat opens once you have a deal."
- Deal: "Deal: Rp 4.200.000. Neither of you will see the other's number."
- No deal: "No deal this round. Your ranges didn't meet, and neither of you learns more than that."
- Try again: "Round 2 of 2. You can only raise your number."
- Paid: "Payment is held. It goes to the seller when you tap Received."
- Proof: "Your number was compared inside a sealed machine. Here's its proof."
Bahasa versions welcome where they read more naturally ("Cocok!").

## Interaction requirements *(Fixed)*
- Every button and field has rest, focus-visible, pressed, disabled and loading states. Touch targets at least 48 px.
- Feedback within 100 ms of any tap. Anything over ~1 s shows progress (the TEE step can take tens of seconds, so make the wait readable).
- Amounts use tabular figures and Rupiah formatting (Rp 4.200.000).
- Confirm before locking a limit. Undo is impossible after locking, so the confirm step carries the weight.
- Keyboard and screen-reader path through every screen. Color is never the only signal (deal vs no deal).

## Motion *(technical limits Fixed; style is Abel's)*
- Animate only `transform` and `opacity`, at 60 fps. Nothing blocks input.
- `prefers-reduced-motion`: big moves become a quick crossfade; nothing loops.
- Keep motion calm near numbers people are entering or reading. The reveal can be the expressive moment.
- Express timings as named tokens (durations and easing curves) so Frontend can use them directly.

## Assets needed *(the list is Fixed; the look is open)*
| Asset | Where | Format |
|---|---|---|
| Logo / wordmark (custom drawn) | app header, README, video, X post, favicon | SVG, light/dark |
| Favicon set | browser tab, home screen | SVG + 32/180/512 PNG |
| Icon set (~10: item, limit, sealed, deal, no deal, pay, received, refund, proof, share) | app | SVG on one grid |
| Reveal animation | screen 7, video | CSS/SVG prototype |
| Waiting / encrypting state art | screens 5-6 | SVG or CSS |
| Empty and error art | 404, offline, errors | SVG |
| OG / social image | link previews, X | 1200x630 PNG |
| README hero | GitHub | PNG/GIF 1280 wide |
| Video title and end cards | demo video | 1920x1080 |
All made in Claude Design (no icon or illustration libraries, no stock or AI-generated images), exported into `app/src/assets/` with a one-line source note.

## Freeze
**Tokens freeze 2026-11-12 12:00 UTC** (colors, type, spacing, motion) so Frontend isn't building against moving values. After that, copy and asset swaps only.

## Surfaces beyond the app
README hero, demo video frames, X post image, OG image. They should feel like the same product as the app. The first 10 seconds of each matter most: that's where judges decide whether to keep looking.

## Polish checklist *(Fixed: what gets checked before submission)*
- Every state above designed, including loading, error, offline, very long and very short content.
- Works at 390, 768, 1280 and 1920 px.
- Fonts licensed and self-hosted, no flash or layout shift.
- Favicon, OG image, page titles, 404, text-selection color, focus rings in the brand style.
- Contrast at least 4.5:1 for text.
- Same tokens, icons and motion across app, README, video and X image.

## Handing designs to Frontend
Share the Claude Design link in team chat. For each screen: the frame at phone width, its states, the tokens used (as CSS variables), and assets exported as SVG. Frontend implements what's in the file and asks rather than guessing.
