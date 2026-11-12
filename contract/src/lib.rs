// Deal contract. Methods and storage: docs/ARCHITECTURE.md.
// D1-04 stub: signatures only. M1-01..M1-04 fill in the bodies and drop this allow.
#![allow(dead_code, unused_variables)]

use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{near, AccountId, PanicOnDefault};

/// Waiting = one side has submitted this round; Retry = no deal this round, more rounds left.
#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum State {
    Created,
    Waiting,
    Computing,
    Retry,
    NoDeal,
    Matched,
    Funded,
    Released,
    Refunded,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Deal {
    pub id: u64,
    pub seller: AccountId,
    pub buyer: Option<AccountId>,
    pub title: String,
    pub description: String,
    /// sha256 of the one-time link token.
    pub link_hash: [u8; 32],
    pub max_rounds: u8,
    pub round: u8,
    /// One ciphertext and commitment per round, public on-chain by design.
    pub seller_cts: Vec<Vec<u8>>,
    pub buyer_cts: Vec<Vec<u8>>,
    pub seller_commits: Vec<[u8; 32]>,
    pub buyer_commits: Vec<[u8; 32]>,
    pub state: State,
    /// yoctoNEAR, set on Matched.
    pub price: Option<U128>,
    pub matched_at_ns: Option<u64>,
    pub deadline_ns: Option<u64>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    deals: LookupMap<u64, Deal>,
    next_id: u64,
    tee_pubkey: Vec<u8>,
    outlayer: AccountId,
    /// Fixed demo rate, Rupiah per NEAR. No setter, so no admin.
    rp_per_near: u128,
}

#[near]
impl Contract {
    #[init]
    pub fn new(outlayer: AccountId, tee_pubkey: Vec<u8>) -> Self {
        unimplemented!()
    }

    /// `max_rounds` must be in 1..=3.
    pub fn create_deal(
        &mut self,
        title: String,
        description: String,
        link_hash: [u8; 32],
        max_rounds: u8,
    ) -> u64 {
        unimplemented!()
    }

    /// The call that completes a round attaches the OutLayer fee.
    #[payable]
    pub fn submit_limit(
        &mut self,
        deal_id: u64,
        ct: Vec<u8>,
        commit: [u8; 32],
        link_token: Option<String>,
    ) {
        unimplemented!()
    }

    /// Callback from OutLayer; reads `promise_result(0)`.
    #[private]
    pub fn on_outlayer_result(&mut self, deal_id: u64) {
        unimplemented!()
    }

    /// Buyer funds exactly the matched price.
    #[payable]
    pub fn deposit(&mut self, deal_id: u64) {
        unimplemented!()
    }

    pub fn confirm_received(&mut self, deal_id: u64) {
        unimplemented!()
    }

    pub fn refund(&mut self, deal_id: u64) {
        unimplemented!()
    }

    pub fn cancel(&mut self, deal_id: u64) {
        unimplemented!()
    }

    pub fn expire(&mut self, deal_id: u64) {
        unimplemented!()
    }

    pub fn get_deal(&self, deal_id: u64) -> Option<Deal> {
        unimplemented!()
    }

    pub fn get_state(&self, deal_id: u64) -> Option<State> {
        unimplemented!()
    }
}
