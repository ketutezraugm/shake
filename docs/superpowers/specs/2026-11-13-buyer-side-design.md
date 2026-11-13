# Buyer and seller roles, buyer tools, two escrow exits

**Date:** 2026-11-13. **Decided by:** Ezra (lead), after testing the wallet flow end to end (MK-06). **Tasks:** MK-50 to MK-56 in `docs/plans/IMPLEMENTATION.md`.

## Why
The buyer side is thin next to the seller's. Every new account lands on "Name your shop" and ends on its own empty shop. Every account gets the Sell and My shop tabs. A buyer who leaves the offer page has no list to come back to.

Testing also found two promises the app makes but cannot keep:
- The paid-offer screen says "If it never arrives, you get your money back after the deadline", but nothing in the app calls the contract's `refund`.
- Nothing calls `expire`, so a buyer who matched and never paid keeps the item reserved forever. The relayer reopens a listing only after the reserving deal has expired.

## What changes
**Must, before the freeze:**
1. **Role choice at sign-up (MK-51).** After the wallet sign-in a new account picks "I want to sell" or "I just want to buy".
   - Sellers keep today's flow.
   - Buyers pick a username (same handle rules), land on `/`, and get the tabs Browse · Saved · My offers · Inbox.
   - The account menu switches between the two at any time.
2. **My offers (MK-52).** Every deal the buyer made an offer on that is still in progress, with its state and next step: raise in round 2, pay, mark received, get my money back, or no deal. Finished purchases link to `/history` (MK-41, #131) for their receipts.
3. **Get my money back (MK-53).** A paid deal past its delivery deadline shows a button that calls `refund`.
4. **Reopen listing (MK-54).** A seller whose buyer matched but never paid within 24 h gets a button that calls `expire`, then syncs the listing.

**Should:**
5. **Saved items (MK-55).** A heart on cards and the listing page, and a Saved page. Kept on this device only.
6. **Seller sales view (MK-56).** Finished sales and their receipts already live on `/history` (MK-41, #131), so this adds only the live states. Every listing with its state: open with its free slots, offers in progress, reserved (waiting for payment, or paid and waiting for Received), sold and paid out, or closed.

## Non-goals and anti-goals
- **No shopping cart.** Every item is its own blind negotiation, its price is known only at the match, and it is paid into its own escrow. There is nothing to total or pay together. Saved items cover "collect what I want".
- Not before the freeze: saved items synced across devices, ratings and email notifications. They need new storage or services and stay in S-11.
- **Anti-goal:** the role must not become a second kind of account. Buying and selling both need the same NEAR wallet (DECISIONS.md, 2026-11-13, "Google login browses and asks"). A Google or email login stays browse-and-ask whatever it picks.

## Constraints
- No relayer, contract or schema change:
  - The role is kept in the browser.
  - My offers reads `GET /me/negotiations` (listing, title, seller, deal id) and `get_deal` per deal.
  - `refund` and `expire` are existing contract calls that anyone may make.
  - The relayer's `POST /listings/:id/sync` already reopens a listing whose reserving deal expired or was refunded (relayer test "reopens the listing when the reserving deal expires or is refunded").
- New screens need Abel's frames first, and motion follows IDENTITY.md (CLAUDE.md).
- Freeze 2026-11-14 00:00 UTC. MK-53 and MK-54 are fixes to promises the Must build already makes.

## Approaches considered
**Where the role lives:**
- **Picked: in the browser.** It needs no migration, can be switched from the menu, and the account is unchanged. The ceiling: a second device asks again, or the builder defaults it (below).
- A `role` column on profiles would follow the user, but it needs a migration, relayer validation and an RLS review. That is too late for the freeze.
- No role, with buyer-first tabs for everyone: no setup, but sellers lose their one-tap Sell and shop, and it does not give Ezra the choice he asked for.

**Saved items:**
- **Picked: localStorage list of listing ids.**
- A Supabase table would need a migration, endpoints and RLS. It is S-11.

**Refund and expire:**
- **Picked: buttons on the screens where the person already is** (the paid offer, the seller's own listing).
- A relayer job calling them would need a funded relayer key, and the app no longer holds one after #112.

## Left to the builder
- The exact wording, from Abel's frames.
- The role for an account that never picked one, for example an old account on a new device. Suggested: seller tabs if `GET /me/listings` is not empty, else buyer tabs.
- My offers can reuse `offerView` (`app/src/offer.ts`) so its labels match the offer screen.
- Saved items that are sold or closed show as such instead of disappearing.
