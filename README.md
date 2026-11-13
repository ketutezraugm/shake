# Shake

A second-hand marketplace where **nobody has to haggle in public**. Every listing shows an asking price. The seller also seals a lowest price they would take, and nobody can read it, including us. Each buyer makes a private offer. A small program running inside a sealed machine compares the two numbers. If they overlap, the deal closes at a random price inside the overlap. If not, the buyer sees only "no deal".

Built for NEAR Hackathon 2026. **Testnet only.** No real money moves.

## What you can do

- Open a seller's shop from a link in their bio (`/@name`), browse listings with photos and an asking price.
- Ask the AI product assistant about an item, or ask the seller in public. Their answer shows to everyone.
- Make a **blind offer**. Up to 3 private rounds per buyer, chosen by the seller.
- On a match, pay into an escrow contract. The money is released when you tap **Received**, or comes back if the item never arrives.
- Chat with the other side once a deal exists.
- Sign in with Google or email to browse and ask. Use a NEAR wallet to sell and to buy.

## Try it on your own machine (about 3 minutes, no accounts, no keys)

You need **Node 22 or newer**. Nothing else: no Rust, no wallet, no `.env`.

```bash
git clone <this repository>
cd blind-deal
npm ci
npm run dev:relayer                                   # terminal 1: a local stand-in for the server
VITE_RELAYER_URL=http://localhost:8787 npm run dev -w app   # terminal 2: the app
```

On Windows PowerShell, set the variable first: `$env:VITE_RELAYER_URL="http://localhost:8787"; npm run dev -w app`.

Open <http://localhost:5173>. This mode runs the whole flow on a simulated chain in your browser: sealing, matching, escrow and chat all behave as on testnet, but nothing leaves your machine and everything resets when you restart the relayer.

**Do this, see this:**

1. Click **Sign in**, then **Continue with Google** (in this mode it skips the real login). Choose **I want to sell**, pick a shop name, for example `demo`. *You land on your shop, `/@demo`.*
2. Open **Sell**. Add a title, up to 4 photos (the ones in `seed/photos/` work), an asking price of `2000000` and a lowest price of `1500000`. Press **Seal and publish**. *You land on your listing, with 3 offer slots.*
3. Open the same address in a second browser profile (or a private window). Sign in, choose **I just want to buy**, pick any name.
4. Open the listing and press **Make a blind offer**. Enter `1800000`, review, **Lock**. *You see "Cocok! It's a deal" and a price between 1.5M and 1.8M. Neither side learns the other's number.*
5. Press **Pay**, then **Received**. *The screen says "Paid out", and the listing is sold.*

To see the private rounds, offer `1200000` in step 4 instead. You get "No deal this round" and one hint to raise. Raise to `1800000`, then in the seller's profile open **Inbox** and press **Open round 2**.

The AI assistant needs a NEAR AI key on the relayer, so in this local mode a question falls back to "Ask the seller". Everything else works.

## Run the checks

```bash
npm run typecheck
npm run lint
npm test            # app (154 tests) and relayer (50)
npm run build
cargo test --workspace   # contract and sealed-machine code, needs Rust
```

CI runs all of these on every pull request (`.github/workflows/ci.yml`).

## Run it against the real testnet

The local mode above is the easy path. The real one needs a Supabase project, a NEAR testnet wallet and an OutLayer deployment. Copy `.env.example` to `.env`; it lists every variable and which side reads it. Key facts:

- The demo contract is `blind-deal-1wxklib7.testnet`.
- `VITE_TEE_PUBKEY` is the public key the app seals offers to. It is not secret and it must match the sealed machine's key.
- `scripts/marketplace-roundtrip.mts` is a live check of the whole path: a listing with slots, a buyer claiming one, a match inside OutLayer, escrow and the sync back to the marketplace.
- Hosted demo: **to be added at submission**.

## How it works

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

- **Limits are encrypted in the browser** to a key that only exists inside the sealed machine. The contract stores the ciphertexts and a commitment to each one, so the machine can tell if a number was swapped.
- **The machine returns `{deal_id, matched, price}` and nothing else.** The price is drawn at random inside the overlap.
- **Money and sealed limits live on the contract. Everything descriptive lives in Supabase**, reached only through the relayer, which never sees a limit or a user's key.
- **Each listing has up to 10 ready-made deals ("slots").** A buyer claims one, so several buyers can offer against the same sealed lowest price.
- Folders: `app/` (the website), `relayer/` (the server), `contract/` (NEAR contract, Rust), `tee/` (the sealed-machine program, Rust), `supabase/` (database migrations), `seed/` (demo listings and photos), `scripts/`, `docs/`.
- Deeper reading: `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/DECISIONS.md`.

The sealed-machine program is public. Its compiled WASM has the SHA-256 `789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904`, and the key it uses is locked to that hash, so a different build cannot read the offers. The deployed contract's code hash on testnet is `a62f3e91d2c75c79fb8ef628f6b894a08da66a1b95cb163a6a2190620e9dc7c2`; anyone can compare it with a build of `contract/` (`npx tsx scripts/freeze-check.mts` does).

## Honest limits

We would rather say these here than have you find them.

- **OutLayer is centrally operated today.** You trust its operator to run the public code as published. The contract accepts a result only through OutLayer's callback path, but nothing yet proves the result came from the pinned WASM.
- **Each round leaks at most one bit**: deal or no deal. A buyer who probes with many offers learns a little each time, so the seller chooses 1 to 3 rounds, a match is binding, and a listing has at most 10 slots.
- **No negotiation method is fair, honest and always finds a deal at once** (Myerson and Satterthwaite). We give up some deals for privacy, and rely on binding deals to make lying costly.
- **The relayer holds each slot's link token.** A token only lets its holder be the buyer on that one deal. It opens no money and no limit, and sellers and browsing never receive it.
- **Ciphertexts on the chain are public forever.** If the sealed machine's key ever leaked, old limits could be read. A limit is only useful during the deal.
- **Keys live in your browser.** For Google and email users the account key is created in the browser and can be exported; lose it and you lose the account. Testnet only.
- **Escrow protects payment, not the item.** If it never arrives you get your money back after the deadline; whether the item is good is between you and the seller.
- **The price is an estimate.** At a match the contract converts Rupiah to NEAR at a fixed demo rate. Each OutLayer run cost about 0.001 NEAR on testnet; we have not verified what it costs elsewhere.

## Credits and sources

- Stickers, icons, logo and motion were drawn for this project (`app/src/design/assets/`).
- Seed photos are freely licensed images from Wikimedia Commons, with their sources in `seed/SOURCES.md`.
- Libraries are listed in `package.json` and `Cargo.toml`. The approach for the sealed key follows OutLayer's `private-dao-example`.
