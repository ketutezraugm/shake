# Design brief

For Abel and her Claude. **Abel owns every visual decision.** This brief separates what's fixed (what the product does, which screens and states exist, technical limits) from what's hers to decide (everything about how it looks and moves). Edit this file freely; it's a starting point, not a contract.

## How to use this
- **Fixed:** sections marked *Fixed* come from the product and the tech. Changing them changes what gets built, so tell the Frontend role first.
- **Starting point:** `docs/IDENTITY.md` (the marosok layout in security-tint blue and carbon-copy yellow) is where the team landed on 10 Nov. Keep it, bend it, or replace it. When something changes, update IDENTITY.md so Frontend builds the current version.
- **Avoid list:** `docs/PLAYBOOK.md` section 6 lists looks the research says judges have seen too often (dark neon crypto, cream-and-serif editorial, stock landing-page structures, library icons). Treat it as advice; override it when you have a reason.

## The product in 60 seconds *(Fixed)*
A seller and a buyer each set a private price limit for one item. A sealed machine (a TEE) compares them. If the ranges overlap, the deal closes at a random price inside the overlap; otherwise both see "no deal" and learn nothing else. The seller picks 1-3 rounds; after a no-deal both may try again (buyer only up, seller only down). The buyer pays into escrow; the money releases when they tap "Received".

**Who and where:** students and ordinary people selling used things, both non-crypto, on a phone, usually mid-WhatsApp chat, 1-3 minutes per deal. Mistakes cost real money, so the number entry and the confirm step must be unmistakable. Second audience: judges watching a split-screen demo on a laptop or projector.

## Screens and states *(Fixed: what exists; how each looks is Abel's call)*
| # | Screen | Purpose | Must show | States |
|---|---|---|---|---|
| 1 | Landing / start | Explain in one look, start a deal | What it does, "Start a deal" | first visit, returning |
| 2 | Name yourself | Walletless account in ~3 s | One name field | taken name, creating, error |
| 3 | Create deal | Seller describes the item | Title, short description, rounds (1/2/3, default 2) | empty, filled, submitting |
| 4 | Share link | Seller sends the buyer link | Link, copy, share to WhatsApp | copied |
| 5 | Enter limit | Each side sets their number privately | Item, own role, Rupiah amount, round x of y, "only you see this" | empty, typing, invalid, confirm step, encrypting |
| 6 | Waiting | One side is in, the other isn't | Own limit is sealed, other side's status | waiting, other side joined |
| 7 | Reveal: deal | The magic moment | Deal price, "neither of you sees the other's number" | — |
| 8 | Reveal: no deal | Rounds left | "No deal this round", rounds left, try again (buyer up / seller down) | rounds left, final no deal |
| 9 | Pay | Buyer funds escrow | Price in Rp and test NEAR, pay | paying, paid, error |
| 10 | Handover | Buyer confirms receipt | "Received" button, deadline, refund note | funded, released, refunded, expired |
| 11 | Proof panel | Show why it's private | What the TEE proved, code hash, on-chain links | verified, unavailable |
| 12 | Demo split screen | Judges see both phones at once | Seller and buyer side by side | seeded deal running |
| — | Global | | | offline, loading first paint, 404, very long item titles |

The reveal (7) is the one moment that should feel like an event. Everything else should get out of the way.

## Copy *(starting drafts; Abel and the team can rewrite)*
- Start: "Name your price without showing it."
- Enter limit (seller): "The lowest you'd accept. Only you will ever see this number."
- Enter limit (buyer): "The most you'd pay. Only you will ever see this number."
- Confirm: "Lock Rp 4.000.000? You can't change it this round."
- Waiting: "Your number is sealed. Waiting for the buyer."
- Deal: "Deal: Rp 4.200.000. Neither of you will see the other's number."
- No deal: "No deal this round. Your ranges didn't meet, and neither of you learns more than that."
- Try again: "Round 2 of 2. You can only raise your number." / "...only lower your number."
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
