# Decisions

Short ADRs, newest last.

## 2026-11-09 Avoid the agent-guard cluster
Security/agents hold half the field (~72 guard-style names). Pick under-contested spaces. (COMPETITORS.md)

## 2026-11-10 Idea: Blind deal (private negotiation)
Round 1 (sticker/GPS game) parked by Ezra as off-track for winning. Blind deal: zero negotiation entries among 373; money-native; AI kept out of the money path. (IDEAS.md)

## 2026-11-10 Price rule: random price inside the overlap
Midpoint leaks the counterparty's limit. A uniform random price in [seller_min, buyer_max] leaks only a bound. Randomness comes from the TEE (OutLayer WASM), not `env::random_seed`, which validators can see.

## 2026-11-10 TEE: OutLayer WASM, not NEAR AI Cloud
NEAR AI Cloud can't run custom code. OutLayer runs our WASM in TDX, called from the contract (private-dao-example pattern). Fallbacks: matching service with a registered key (trust stated), then commit-reveal. (raw/tee-spike.md)

## 2026-11-10 Identity: B layout + A colors
Abel's pick: marosok sarong/ear-tag structure, security-tint blue + carbon-copy yellow. (IDENTITY.md)

## 2026-11-10 Result trust
Must: OutLayer callback path + stated centralisation. Should: enclave-signed results verified in the contract.

## 2026-11-10 Units: Rupiah in, testnet NEAR in escrow at a fixed demo rate
Users think in Rupiah. Fixed `rp_per_near` set at init (default 10,000,000); no oracle.

## 2026-11-10 Binding deals without a bond
A matched buyer who never pays can't be forced; `expire` frees the deal after 24 h. A buyer bond would leak information if sized to the limit; a fixed bond is a Could.

## 2026-11-10 NEAR AI Cloud key stays server-side
The relayer proxies NEAR AI requests and adds the API key; prompts are E2EE from the browser to the model's attested key, so the relayer can't read them (verify in spike).

## 2026-11-10 App account
`kodejari.testnet` is free (checked via RPC 2026-11-10) but the name isn't chosen; create the parent account once the name is final. Sub-accounts: `<name>.<parent>.testnet`.

## 2026-11-10 No database
The contract is the source of truth; no Supabase.

## 2026-11-11 Private rounds replace "one attempt"
Team feedback: one attempt punishes misjudgment. Seller chooses 1-3 rounds per buyer (default 2); concessions are monotonic (buyer up, seller down), enforced in the TEE; each round leaks at most 1 bit; a deal ends the game. Laddering accepted as private haggling. "Close" hint dropped (leaks more). Contract: `max_rounds`, `round`, per-round ciphertexts, `Retry` state. (IDEAS.md, feedback section)
