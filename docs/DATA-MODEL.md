# Data model

There is no database (DECISIONS.md, 2026-11-10). The contract is the source of truth. This page maps every piece of data to the one place it lives, so the contract, the TEE, the relayer and the app encode the same shapes. It describes the contract as built (`contract/src/lib.rs`, deployed at M1-07); field names match the code.

## Where each piece of data lives

| Store | Persistence | Owner | Holds | Never holds |
|---|---|---|---|---|
| Contract storage (on-chain) | Permanent, public | Ezra | `Config`, `Deal`, per-round ciphertexts and commitments, escrow state | Plaintext limits, salts, the TEE secret |
| TEE (OutLayer WASM) | Memory for one execution | Ezra | Decrypted limits and salts, the `PROTECTED_` secret | Anything after the call returns |
| Relayer (Node) | None, except in-memory rate-limit counters | Harfi | Request and response types for `POST /accounts` | Deal data, limits, secret keys, NEAR AI prompts |
| Browser (localStorage, URL) | Per device | Jose | ed25519 keypair, per-round salts, the buyer link token | Nothing leaves it except public key, ciphertext and commit |
| `docs/real-deals.md` | Markdown file | Harfi | Anonymised outcome log (S-08) | Names, limits. Not a table, keep it that way |

There is no list-all-deals method. Deals are read by id only, so a "my deals" view is a non-goal. If one is wanted later, it is an optional read-only indexer over contract events, recorded in DECISIONS.md first. Item photos are a PRD "Could", so `Deal` has no media fields.

## ERD

```mermaid
erDiagram
    CONFIG ||--o{ DEAL : "next_id assigns ids"
    ACCOUNT ||--o{ DEAL : "seller"
    ACCOUNT |o--o{ DEAL : "buyer, bound by first valid link token"
    DEAL ||--|{ ROUND : "1 to max_rounds"
    ROUND ||--o{ LIMIT_PLAINTEXT : "decrypts to, TEE only"
    ROUND ||--o| OUTLAYER_RESPONSE : "result of"
    RELAYER ||--o{ ACCOUNT : "creates and funds"

    CONFIG {
        accountid outlayer "set in new, no setter"
        bytes tee_pubkey "deal public key"
        string project_id "OutLayer owner/name"
        u128 rp_per_near "constant 100,000,000"
        u64 next_id
    }
    ACCOUNT {
        accountid account_id PK "name.parent.testnet"
        string public_key "ed25519, full access key"
    }
    DEAL {
        u64 id PK
        accountid seller FK
        accountid buyer FK "null until first buyer binds"
        string title "bounded length"
        string description "bounded length"
        bytes32 link_hash "sha256 of one-time token"
        u8 max_rounds "1 to 3, default 2"
        u8 round "starts at 1"
        enum state
        u128 price "yoctoNEAR escrow amount, set on Matched"
        u64 matched_at_ns "set on Matched"
        u64 deadline_ns "set on Funded"
    }
    ROUND {
        u64 deal_id FK
        u8 n "1 to 3"
        bytes seller_ct "public by design, max 512 bytes"
        bytes32 seller_commit
        bytes buyer_ct "public by design, max 512 bytes"
        bytes32 buyer_commit
        enum result "pending, matched, no_deal, invalid"
    }
    LIMIT_PLAINTEXT {
        u64 deal_id
        enum side "seller or buyer"
        u8 round
        string limit "decimal Rupiah"
        string salt "hex"
    }
    OUTLAYER_RESPONSE {
        bool success "envelope; false means the run failed"
        u64 deal_id "in result"
        bool matched "in result, absent when invalid"
        string price "in result, decimal Rupiah, only if matched"
        string error "result error invalid, or envelope error when success is false"
    }
    RELAYER {
        string account_id "RELAYER_ACCOUNT_ID"
    }
    RATE_LIMIT_BUCKET {
        string ip PK "in memory, 3 per hour"
        u8 count
        u64 window_start
    }
```

`ROUND` is the logical view. In storage and in `get_deal` it is the four parallel vectors on `Deal` (`seller_cts`, `buyer_cts`, `seller_commits`, `buyer_commits`), index `n - 1`. `result` is derived from `state` and `round`, not stored. `RATE_LIMIT_BUCKET` is one in-memory map plus one global daily counter, with no persistence. A restart resets it, which is acceptable for a testnet demo.

`LIMIT_PLAINTEXT` is never stored. It exists only inside the TEE for the length of one `match` call. Its commitment is `sha256("blind-deal:v1|{deal_id}|{side}|{round}|{limit}|{salt}")`, the same string on client and TEE (`tee/src/commit.rs`); `tee/testvectors.json` pins examples.

## States

| State | Meaning | Entered by | Fields set |
|---|---|---|---|
| Created | Deal exists, no limit yet | Seller `create_deal` | `id`, `link_hash`, `max_rounds`, `round = 1` |
| Waiting | One side has submitted this round | First `submit_limit` of a round | round ciphertext and commit |
| Computing | Both in, OutLayer running | The `submit_limit` that completes the round, with a nonzero fee | second ciphertext and commit |
| Retry | No deal this round, more rounds left | `on_outlayer_result`, `matched: false` or malformed, `round < max_rounds` | `round` incremented |
| NoDeal | Final, no deal | `on_outlayer_result`, `matched: false` or malformed, `round == max_rounds`; seller `cancel` in Created or Waiting; `expire` by anyone 24 h after `matched_at_ns` while unfunded | none |
| Matched | Overlap found | `on_outlayer_result`, `matched: true` | `price`, `matched_at_ns` |
| Funded | Buyer deposited exactly `price` | Buyer `deposit` | `deadline_ns` (7 days on) |
| Released | Seller paid | Buyer `confirm_received` | none |
| Refunded | Buyer paid back | `refund` by anyone after `deadline_ns` | none |

Final states are NoDeal, Released and Refunded. There are no separate Cancelled or Expired states: a cancelled or expired deal reads as NoDeal. The app tells them apart from the fields: expired has `matched_at_ns` set; cancelled has fewer than `round` ciphertexts on at least one side; otherwise the ranges did not overlap. A malformed or failed OutLayer result counts as a no-deal for that round and follows the Retry or NoDeal rule. A deal stays in Computing only if the callback itself fails, which has no escape yet (DECISIONS.md, contract hardening).

## Units

Users enter Rupiah. The TEE sees and returns Rupiah as integer strings. The contract converts once, at Matched, as Rupiah times `1e24 / rp_per_near`, and stores only the yoctoNEAR `price`. The app shows Rupiah as `price / 1e16`. `deposit` must attach exactly `price`.

Example at the rate of 100,000,000: Rp 4,200,000 becomes 0.042 testnet NEAR, so `price` is 42,000,000,000,000,000,000,000.

## Earlier proposals, settled

The first draft of this page proposed `Cancelled` and `Expired` states, splitting `price` into `price_rp` and `price_yocto`, `rp_per_near` as a `new` argument, and `cancel` only while no buyer is bound. The contract (M1-01 to M1-07) shipped without them and is live on testnet, so this page follows the code. Adopted from the draft: `Waiting` replaces `SellerIn`, `create_deal` takes `max_rounds`, the plaintext carries `round`, and a malformed result is a no-deal for the round.

## Who builds from this

| Task | Owner | Uses |
|---|---|---|
| Contract (done, M1-01 to M1-07) | Ezra | `Config`, `Deal`, `State`, units |
| `app/src/contract.ts` (done, D1-05) | Ezra | `Deal`, `State`, OutLayer shapes |
| D1-06 `relayer/src/types.ts` | Harfi | `ACCOUNT` fields, error codes 409, 429, 503 |
| D1-10 `mockClient.ts` | Jose | In-memory `Deal` map keyed by `id`, same state machine |
