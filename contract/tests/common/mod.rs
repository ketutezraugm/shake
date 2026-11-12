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

pub fn new_contract() -> Contract {
    at(0, 0);
    Contract::new(accounts(OUTLAYER), vec![2; 33], PROJECT.to_string())
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
