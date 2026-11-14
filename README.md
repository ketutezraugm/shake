# Shake

**Shake** is a second-hand marketplace where **nobody has to haggle in public**. Every listing
shows an asking price. The seller also seals the lowest price they would take, and nobody can read
it, including us. Each buyer makes a private offer. A small program inside a sealed machine
(an **OutLayer TEE**) compares the two numbers. If they overlap, the deal closes at a random price
inside the overlap and the buyer pays into a **NEAR escrow contract**. If not, the buyer sees only
"no deal".

Built for NEAR Hackathon 2026. This is a working build on **NEAR testnet**, not a mockup: limits
are sealed in the browser, matched inside OutLayer, and settled by our own contract. No real money
moves.

## Live demo

| | |
| --- | --- |
| **App** | To be added at submission |
| **Demo video** | To be added at submission |
| **Deal contract** (testnet) | [`blind-deal-1wxklib7.testnet`](https://testnet.nearblocks.io/address/blind-deal-1wxklib7.testnet) |
| **Sealed-machine WASM** (SHA-256) | `789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904` |
| **Contract code hash** | `a62f3e91d2c75c79fb8ef628f6b894a08da66a1b95cb163a6a2190620e9dc7c2` |

No time to deploy anything? [Try it locally](#try-it-locally) in about 3 minutes with no
accounts and no keys.

## Tracks

| Track | How this repo fits it |
| --- | --- |
| **Privacy & Private AI** | Limits are encrypted in the browser to a key that only exists inside the TEE, and that key opens only for the pinned WASM build. The machine returns `{deal_id, matched, price}` and nothing else. The relayer and the AI assistant never see a lowest price or an offer. The buyer's proof panel recomputes each commitment to show the sealed offer is the one they sent. |
| **Real-World Money** | Escrowed payments between real sellers and buyers: reserved, paid, sold, refunded and reopened states, receipts with transaction links, a shop link for a social bio, and Google or email sign-in for people who have never held a wallet. |
| **Agent Economy** | The product assistant runs on NEAR AI Cloud through the relayer. It answers from the listing and its public Q&A, never discusses offers or the lowest price, and hands anything it can't answer to the seller. |

## What's built

| Feature | Status | Where |
| --- | --- | --- |
| Sealed lowest price and blind offers | **Built**: encrypted in the browser (ECIES) to the TEE's public key, with a `sha256` commitment stored next to each ciphertext | [`app/src/crypto.ts`](app/src/crypto.ts), [`app/src/offer.ts`](app/src/offer.ts) |
| Matching inside the TEE | **Built**: decrypts both limits, checks commitments, draws a random price inside the overlap | [`tee/src`](tee/src) |
| Escrow and deal states on NEAR | **Built**: claim, match, pay, release on **Received**, refund after the deadline, reopen | [`contract/src/lib.rs`](contract/src/lib.rs) |
| Up to 3 private rounds, chosen by the seller | **Built**: each "no deal" gives the buyer one hint to raise | [`app/src/screens/Offer.tsx`](app/src/screens/Offer.tsx) |
| Up to 10 offer slots per listing | **Built**: pre-created deals, so several buyers can offer against one sealed price | [`app/src/slots.ts`](app/src/slots.ts) |
| Proof panel | **Built**: the buyer recomputes their own commitments against the chain | [`app/src/proof.ts`](app/src/proof.ts), [`app/src/screens/Proof.tsx`](app/src/screens/Proof.tsx) |
| Seller shops linked from a bio (`/@name`) | **Built**: listings with photos, a shop hub with orders and sales | [`app/src/screens/Profile.tsx`](app/src/screens/Profile.tsx), [`app/src/screens/Orders.tsx`](app/src/screens/Orders.tsx) |
| AI product assistant and public Q&A | **Built**: needs a NEAR AI key on the relayer; falls back to "Ask the seller" without one | [`app/src/screens/Assistant.tsx`](app/src/screens/Assistant.tsx), [`app/src/qa.ts`](app/src/qa.ts) |
| Chat after a deal | **Built** | [`app/src/screens/Chat.tsx`](app/src/screens/Chat.tsx), [`app/src/inbox.ts`](app/src/inbox.ts) |
| Sign-in with Google, email or a NEAR wallet | **Built**: browsing and asking need any sign-in; selling and buying need a NEAR account | [`app/src/auth.ts`](app/src/auth.ts), [`app/src/wallet.ts`](app/src/wallet.ts) |
| Proof that a result came from the pinned WASM | Not built: see [Honest limits](#honest-limits) | — |

## Architecture

```
 browser (seller, buyer)                       NEAR testnet
 ┌──────────────────────┐   sealed limits      ┌──────────────────────────────┐
 │ app (React, Vite)    │ ───────────────────▶ │ deal contract                │
 │ seals the limit with │                      │ holds ciphertexts, the state │
 │ the machine's key    │ ◀─────────────────── │ and the escrow money         │
 └─────────┬────────────┘   deal / no deal     └──────────────┬───────────────┘
           │ listings, photos, questions, chat                │ asks, once per round
           ▼                                                  ▼
 ┌──────────────────────┐                      ┌──────────────────────────────┐
 │ relayer + Supabase   │                      │ OutLayer sealed machine      │
 │ (no limits, no keys) │                      │ decrypts both, compares,     │
 └──────────────────────┘                      │ returns only deal / no deal  │
                                               └──────────────────────────────┘
```

**Money and secrets live on the chain; everything descriptive lives in Supabase.** The contract
holds sealed limits, commitments, deal state and escrowed NEAR. Listings, photos, questions and
chat live in Supabase, reached only through the relayer, which never sees a limit or a user's key.

## Deal flow

1. **List**: the seller sets an asking price and a lowest price. The browser encrypts the lowest
   price to the sealed machine's public key and stores the ciphertext and its commitment on the
   contract, across up to 10 pre-created deals ("slots").
2. **Ask**: buyers browse the shop, ask the AI assistant, or ask the seller in public. Answers show
   to everyone.
3. **Offer**: the buyer claims a slot and makes a blind offer, encrypted and committed the same
   way. Neither side ever sees the other's number.
4. **Match**: the contract asks OutLayer once per round. The machine decrypts both limits, checks
   them against their commitments (so a swapped number is caught), and returns only
   `{deal_id, matched, price}`, with the price drawn at random inside the overlap.
5. **No deal, try again**: the buyer sees "no deal" and one hint to raise. The seller decides
   whether to open round 2 or 3.
6. **Pay and release**: on a match the buyer pays into escrow. The money goes to the seller when the
   buyer taps **Received**, or back to the buyer if the item never arrives by the deadline.

Deeper reading: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DATA-MODEL.md`](docs/DATA-MODEL.md), [`docs/DECISIONS.md`](docs/DECISIONS.md).

### Verify the build

The sealed-machine program is public. Its key is locked to the WASM hash above, so a different
build cannot read the offers. To compare the deployed contract with a build of `contract/`:

```bash
npx tsx scripts/freeze-check.mts
```

## Try it locally

About 3 minutes, no accounts, no keys. You need **Node 22 or newer**; no Rust, no wallet, no
`.env`.

```bash
git clone https://github.com/ketutezraugm/blind-deal.git
cd blind-deal
npm ci
npm run dev:relayer                                         # terminal 1: a local stand-in for the server
VITE_RELAYER_URL=http://localhost:8787 npm run dev -w app   # terminal 2: the app
```

On Windows PowerShell, set the variable first:
`$env:VITE_RELAYER_URL="http://localhost:8787"; npm run dev -w app`.

Open <http://localhost:5173>. This mode runs the whole flow on a simulated chain in your browser:
sealing, matching, escrow and chat behave as on testnet, but nothing leaves your machine and
everything resets when you restart the relayer.

**Do this, see this:**

| # | Do this | See this |
| --- | --- | --- |
| 1 | Click **Sign in**, then **Continue with Google** (this mode skips the real login). Choose **I want to sell** and a shop name, for example `demo`. | You land on your shop, `/@demo`. |
| 2 | Open **Sell**. Add a title, up to 4 photos (`seed/photos/` works), asking price `2000000`, lowest price `1500000`. Press **Seal and publish**. | Your listing, with 3 offer slots. |
| 3 | Open the same address in a second browser profile or a private window. Sign in, choose **I just want to buy**, pick any name. | You are signed in as a buyer. |
| 4 | Open the listing, press **Make a blind offer**, enter `1800000`, review, **Lock**. | "Cocok! It's a deal" and a price between 1.5M and 1.8M. Neither side learns the other's number. |
| 5 | Press **Pay**, then **Received**. | "Paid out", and the listing is sold. |

**To see the private rounds**, offer `1200000` in step 4 instead. You get "No deal this round"
and one hint to raise. Raise to `1800000`, then as the seller open **Inbox** and press
**Open round 2**.

## Run the checks

```bash
npm run typecheck
npm run lint
npm test                  # app and relayer; the 5 live-network relayer tests skip without credentials
npm run build
cargo test --workspace    # contract and sealed-machine code, needs Rust
```

CI runs all of these on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Run it against the real testnet

The real path needs a Supabase project, a NEAR testnet wallet and an OutLayer deployment. Copy
`.env.example` to `.env`; it lists every variable and which side reads it.

- `VITE_TEE_PUBKEY` is the public key the app seals offers to. It is not secret, and it must match
  the sealed machine's key.
- [`scripts/marketplace-roundtrip.mts`](scripts/marketplace-roundtrip.mts) is a live check of the
  whole path: a listing with slots, a buyer claiming one, a match inside OutLayer, escrow, and the
  sync back to the marketplace.

## What's real vs. simulated

| | Status |
| --- | --- |
| Sealing limits in the browser, commitments on the chain | **Real** on testnet |
| Matching inside OutLayer (Intel TDX), hash-pinned WASM | **Real** on testnet |
| Escrow, release on **Received**, refund after the deadline | **Real**: testnet NEAR moves through the contract |
| Listings, photos, Q&A, chat | **Real**: Supabase through the relayer |
| AI product assistant | **Real** with a NEAR AI key on the relayer |
| Rupiah to NEAR conversion | **Simulated**: a fixed demo rate |
| Local mode (`npm run dev:relayer`) | **Simulated** chain in the browser, for trying the flow without keys |
| Mainnet | Not used. Testnet only |

## Honest limits

We would rather say these here than have you find them.

- **OutLayer is centrally operated today.** You trust its operator to run the public code as
  published. The contract accepts a result only through OutLayer's callback path, but nothing yet
  proves the result came from the pinned WASM.
- **Each round leaks at most one bit**: deal or no deal. A buyer who probes with many offers learns
  a little each time, so the seller chooses 1 to 3 rounds, a match is binding, and a listing has at
  most 10 slots.
- **No negotiation method is fair, honest and always finds a deal at once** (Myerson and
  Satterthwaite). We give up some deals for privacy, and rely on binding deals to make lying costly.
- **The relayer holds each slot's link token.** A token only lets its holder be the buyer on that
  one deal. It opens no money and no limit, and sellers and browsing never receive it.
- **Ciphertexts on the chain are public forever.** If the sealed machine's key ever leaked, old
  limits could be read. A limit is only useful during the deal.
- **Keys live in your browser.** For Google and email users the account key is created in the
  browser and can be exported; lose it and you lose the account.
- **Escrow protects payment, not the item.** If it never arrives you get your money back after the
  deadline; whether the item is good is between you and the seller.
- **The price is an estimate.** Each OutLayer run cost about 0.001 NEAR on testnet; we have not
  verified what it costs elsewhere.

## Repo layout

| Folder | Role |
| --- | --- |
| [`app`](app) | The website: React and Vite, sealing, offers, escrow, shops, chat |
| [`relayer`](relayer) | The server between the app and Supabase; never sees a limit or a key |
| [`contract`](contract) | NEAR deal and escrow contract (Rust) |
| [`tee`](tee) | The sealed-machine program that runs on OutLayer (Rust, WASM) |
| [`supabase`](supabase) | Database migrations |
| [`seed`](seed) | Demo listings and photos |
| [`scripts`](scripts) | Deploy, freeze check and live round-trip scripts |
| [`docs`](docs) | Architecture, data model, decisions, product spec |

## Credits and sources

- Stickers, icons, logo and motion were drawn for this project
  ([`app/src/design/assets/`](app/src/design/assets)).
- Seed photos are freely licensed images from Wikimedia Commons, with their sources in
  [`seed/SOURCES.md`](seed/SOURCES.md).
- Libraries are listed in `package.json` and `Cargo.toml`. The approach for the sealed key follows
  OutLayer's `private-dao-example`.

## License

MIT, see [`LICENSE`](LICENSE).
