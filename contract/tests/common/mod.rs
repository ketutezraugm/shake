// Shared by the contract's integration tests. Accounts: 0 is the contract, 1 seller, 2 buyer,
// 3 an outsider, 4 OutLayer.
#![allow(dead_code)]
use contract::Contract;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken};

pub const SELLER: usize = 1;
pub const BUYER: usize = 2;
pub const OUTSIDER: usize = 3;
pub const OUTLAYER: usize = 4;
pub const PROJECT: &str = "spike.testnet/blind-deal";
/// An attached deposit that covers one OutLayer execution (0.0021 NEAR).
/// Block timestamp used by `callback_context`.
pub const NOW_NS: u64 = 1_700_000_000_000_000_000;
pub const FEE: u128 = 2_100_000_000_000_000_000_000;

pub fn who(i: usize) -> AccountId {
    accounts(i)
}

/// Sets the call context: predecessor and attached deposit (yocto).
pub fn at(predecessor: usize, deposit: u128) {
    testing_env!(VMContextBuilder::new()
        .current_account_id(accounts(0))
        .predecessor_account_id(accounts(predecessor))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .build());
}

/// Like `at`, with the block timestamp (ns).
pub fn at_time(predecessor: usize, deposit: u128, timestamp_ns: u64) {
    testing_env!(VMContextBuilder::new()
        .current_account_id(accounts(0))
        .predecessor_account_id(accounts(predecessor))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_timestamp(timestamp_ns)
        .build());
}

pub fn new_contract() -> Contract {
    new_contract_with_window(None)
}

/// A contract whose delivery window is `window_secs` instead of the 7-day default.
pub fn new_contract_with_window(window_secs: Option<u64>) -> Contract {
    at(0, 0);
    Contract::new(
        accounts(OUTLAYER),
        vec![2; 33],
        PROJECT.to_string(),
        window_secs,
    )
}

pub fn token_hash(token: &str) -> [u8; 32] {
    near_sdk::env::sha256_array(token.as_bytes())
}

pub fn panics<F: FnOnce()>(f: F) -> bool {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).is_err()
}

/// Runs the next call as OutLayer's callback delivering `result` (the matcher's stdout).
pub fn callback_context(result: &str) {
    testing_env!(
        VMContextBuilder::new()
            .current_account_id(accounts(0))
            .predecessor_account_id(accounts(0))
            .block_timestamp(NOW_NS)
            .build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Successful(
            result.as_bytes().to_vec()
        )]
    );
}

pub fn no_deal(deal_id: u64) -> String {
    near_sdk::serde_json::json!({ "success": true, "result": { "deal_id": deal_id, "matched": false } }).to_string()
}

/// Asserts that `f` panics and that the panic message contains `msg`.
pub fn panics_with<F: FnOnce()>(msg: &str, f: F) {
    let err =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).expect_err("expected a panic");
    let text = err
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(
        text.contains(msg),
        "panic {text:?} does not contain {msg:?}"
    );
}

/// A deal from the seller with link token "tok".
pub fn deal(c: &mut Contract, max_rounds: u8) -> u64 {
    at(SELLER, 0);
    c.create_deal("bike".into(), "red".into(), token_hash("tok"), max_rounds)
}

pub fn submit(c: &mut Contract, id: u64, who: usize, deposit: u128, token: Option<&str>) {
    at(who, deposit);
    c.submit_limit(id, vec![1; 10], [9; 32], token.map(String::from));
}

/// Both sides submit; the buyer completes the round. The link token is only needed in round 1.
pub fn play_round(c: &mut Contract, id: u64, token: Option<&str>) {
    submit(c, id, SELLER, 0, None);
    submit(c, id, BUYER, FEE, token);
}

/// The callback as it runs when OutLayer's execution failed.
pub fn callback_failed_context() {
    testing_env!(
        VMContextBuilder::new()
            .current_account_id(accounts(0))
            .predecessor_account_id(accounts(0))
            .build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Failed]
    );
}

pub fn matched(deal_id: u64, price: &str) -> String {
    near_sdk::serde_json::json!({ "success": true, "result": { "deal_id": deal_id, "matched": true, "price": price } })
        .to_string()
}

/// Rp 4.3M at the demo rate, in yoctoNEAR.
pub const PRICE: u128 = 43_000_000_000_000_000_000_000;
pub const DAY_NS: u64 = 86_400_000_000_000;

/// A deal matched at `NOW_NS` for `PRICE`.
pub fn matched_deal(c: &mut Contract) -> u64 {
    let id = deal(c, 2);
    play_round(c, id, Some("tok"));
    callback_context(&matched(id, "4300000"));
    c.on_outlayer_result(id);
    id
}
