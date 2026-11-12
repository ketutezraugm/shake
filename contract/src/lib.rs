// Deal contract. Methods and storage: docs/ARCHITECTURE.md, docs/DATA-MODEL.md.
use near_sdk::json_types::U128;
use near_sdk::serde::Deserialize;
use near_sdk::serde_json::{self, json};
use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

const MAX_TITLE_BYTES: usize = 100;
const MAX_DESCRIPTION_BYTES: usize = 1000;
/// Demo rate: Rp 4.2M escrows 0.042 testnet NEAR.
const RP_PER_NEAR: u128 = 100_000_000;
/// Gas for the OutLayer call and for our callback; tune against a real round trip (M1-07).
const REQUEST_GAS: Gas = Gas::from_tgas(200);
const CALLBACK_GAS: Gas = Gas::from_tgas(20);
const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MAX_RESULT_BYTES: usize = 1024;
/// An ECIES limit is about 200 bytes; the cap stops callers filling contract-paid storage.
const MAX_CT_BYTES: usize = 512;
const DAY_NS: u64 = 86_400_000_000_000;
/// The buyer can reclaim a funded deposit this long after funding if never confirmed.
const DELIVERY_WINDOW_NS: u64 = 7 * DAY_NS;
/// A matched deal nobody funded can be closed by anyone after this long.
const FUNDING_WINDOW_NS: u64 = DAY_NS;

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
    /// OutLayer project that runs the matcher, `owner.testnet/name`; its owner holds the secret.
    project_id: String,
    /// Fixed demo rate, Rupiah per NEAR. No setter, so no admin.
    rp_per_near: u128,
}

#[near]
impl Contract {
    #[init]
    pub fn new(outlayer: AccountId, tee_pubkey: Vec<u8>, project_id: String) -> Self {
        require!(project_id.contains('/'), "project_id must be owner/name");
        Self {
            deals: LookupMap::new(b"d"),
            next_id: 0,
            tee_pubkey,
            outlayer,
            project_id,
            rp_per_near: RP_PER_NEAR,
        }
    }

    /// `max_rounds` must be in 1..=3.
    pub fn create_deal(
        &mut self,
        title: String,
        description: String,
        link_hash: [u8; 32],
        max_rounds: u8,
    ) -> u64 {
        require!((1..=3).contains(&max_rounds), "max_rounds must be 1-3");
        require!(
            !title.is_empty() && title.len() <= MAX_TITLE_BYTES,
            "title must be 1-100 bytes"
        );
        require!(
            description.len() <= MAX_DESCRIPTION_BYTES,
            "description must be at most 1000 bytes"
        );
        let id = self.next_id;
        self.next_id += 1;
        let deal = Deal {
            id,
            seller: env::predecessor_account_id(),
            buyer: None,
            title,
            description,
            link_hash,
            max_rounds,
            round: 1,
            seller_cts: vec![],
            buyer_cts: vec![],
            seller_commits: vec![],
            buyer_commits: vec![],
            state: State::Created,
            price: None,
            matched_at_ns: None,
            deadline_ns: None,
        };
        self.deals.insert(id, deal);
        id
    }

    /// The call that completes a round attaches the OutLayer fee; any other call attaches nothing.
    #[payable]
    pub fn submit_limit(
        &mut self,
        deal_id: u64,
        ct: Vec<u8>,
        commit: [u8; 32],
        link_token: Option<String>,
    ) {
        require!(ct.len() <= MAX_CT_BYTES, "ciphertext too large");
        let caller = env::predecessor_account_id();
        let mut deal = self.deal_or_panic(deal_id);
        require!(
            matches!(deal.state, State::Created | State::Waiting | State::Retry),
            "deal is not accepting limits"
        );
        let is_seller = caller == deal.seller;
        if !is_seller {
            match &deal.buyer {
                Some(buyer) => require!(*buyer == caller, "only the deal's buyer can submit"),
                None => {
                    require!(deal.state == State::Waiting, "the seller submits first");
                    let token = link_token.unwrap_or_else(|| env::panic_str("link token required"));
                    require!(
                        env::sha256_array(token.as_bytes()) == deal.link_hash,
                        "invalid link token"
                    );
                    deal.buyer = Some(caller);
                }
            }
        }
        let (cts, commits) = if is_seller {
            (&mut deal.seller_cts, &mut deal.seller_commits)
        } else {
            (&mut deal.buyer_cts, &mut deal.buyer_commits)
        };
        require!(
            cts.len() < usize::from(deal.round),
            "already submitted this round"
        );
        cts.push(ct);
        commits.push(commit);

        let round = usize::from(deal.round);
        let complete = deal.seller_cts.len() == round && deal.buyer_cts.len() == round;
        let fee = env::attached_deposit();
        if !complete {
            require!(
                fee.is_zero(),
                "attach the fee only on the call that completes the round"
            );
            deal.state = State::Waiting;
            self.deals.insert(deal_id, deal);
            return;
        }
        // Without a fee OutLayer refuses the call and the round would be lost as a no-deal.
        require!(
            !fee.is_zero(),
            "attach the OutLayer fee on the call that completes the round"
        );
        deal.state = State::Computing;
        let request = self.outlayer_request(&deal);
        self.deals.insert(deal_id, deal);
        let promise = Promise::new(self.outlayer.clone())
            .function_call("request_execution".to_string(), request, fee, REQUEST_GAS)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_outlayer_result(deal_id),
            );
        drop(promise); // near-sdk schedules a promise when it is dropped; a failed call must not undo the submit
    }

    /// Callback from OutLayer with the matcher's result. A failed execution and any malformed or
    /// mismatching result count as a no-deal for the round. The caller check is explicit because
    /// `#[private]` only guards the compiled entry point, not direct calls in tests.
    pub fn on_outlayer_result(&mut self, deal_id: u64) {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "on_outlayer_result is private"
        );
        let mut deal = self.deal_or_panic(deal_id);
        require!(deal.state == State::Computing, "deal is not computing");
        match self.matched_price(deal_id) {
            Some(price) => {
                deal.state = State::Matched;
                deal.price = Some(U128(price));
                deal.matched_at_ns = Some(env::block_timestamp());
            }
            None if deal.round < deal.max_rounds => {
                deal.round += 1;
                deal.state = State::Retry;
            }
            None => deal.state = State::NoDeal,
        }
        self.deals.insert(deal_id, deal);
    }

    /// Buyer funds exactly the matched price; the delivery window starts now.
    #[payable]
    pub fn deposit(&mut self, deal_id: u64) {
        let mut deal = self.deal_or_panic(deal_id);
        require!(deal.state == State::Matched, "deal is not matched");
        require!(
            deal.buyer.as_ref() == Some(&env::predecessor_account_id()),
            "only the buyer can deposit"
        );
        let price = deal
            .price
            .unwrap_or_else(|| env::panic_str("matched deal without a price"))
            .0;
        require!(
            env::attached_deposit().as_yoctonear() == price,
            "attach exactly the price"
        );
        deal.state = State::Funded;
        deal.deadline_ns = Some(env::block_timestamp() + DELIVERY_WINDOW_NS);
        self.deals.insert(deal_id, deal);
    }

    /// The buyer confirms receipt and the escrow pays the seller.
    pub fn confirm_received(&mut self, deal_id: u64) -> Promise {
        let mut deal = self.deal_or_panic(deal_id);
        require!(deal.state == State::Funded, "deal is not funded");
        require!(
            deal.buyer.as_ref() == Some(&env::predecessor_account_id()),
            "only the buyer can confirm"
        );
        deal.state = State::Released; // before the transfer, so a second call cannot pay twice
        let payout = Promise::new(deal.seller.clone()).transfer(Self::escrowed(&deal));
        self.deals.insert(deal_id, deal);
        payout
    }

    /// Anyone can return the deposit to the buyer once the delivery window has passed.
    pub fn refund(&mut self, deal_id: u64) -> Promise {
        let mut deal = self.deal_or_panic(deal_id);
        require!(deal.state == State::Funded, "deal is not funded");
        let deadline = deal
            .deadline_ns
            .unwrap_or_else(|| env::panic_str("funded deal without a deadline"));
        require!(
            env::block_timestamp() > deadline,
            "the deadline has not passed"
        );
        let buyer = deal
            .buyer
            .clone()
            .unwrap_or_else(|| env::panic_str("funded deal without a buyer"));
        deal.state = State::Refunded;
        let payout = Promise::new(buyer).transfer(Self::escrowed(&deal));
        self.deals.insert(deal_id, deal);
        payout
    }

    /// The seller withdraws a deal before both sides have submitted. It ends as NoDeal.
    pub fn cancel(&mut self, deal_id: u64) {
        let mut deal = self.deal_or_panic(deal_id);
        require!(
            env::predecessor_account_id() == deal.seller,
            "only the seller can cancel"
        );
        require!(
            matches!(deal.state, State::Created | State::Waiting),
            "too late to cancel"
        );
        deal.state = State::NoDeal;
        self.deals.insert(deal_id, deal);
    }

    /// Anyone can close a matched deal the buyer never funded.
    pub fn expire(&mut self, deal_id: u64) {
        let mut deal = self.deal_or_panic(deal_id);
        require!(deal.state == State::Matched, "deal is not matched");
        let matched_at = deal
            .matched_at_ns
            .unwrap_or_else(|| env::panic_str("matched deal without a time"));
        require!(
            env::block_timestamp() > matched_at + FUNDING_WINDOW_NS,
            "too early to expire"
        );
        deal.state = State::NoDeal;
        self.deals.insert(deal_id, deal);
    }

    pub fn get_deal(&self, deal_id: u64) -> Option<Deal> {
        self.deals.get(&deal_id).cloned()
    }

    pub fn get_state(&self, deal_id: u64) -> Option<State> {
        self.deals.get(&deal_id).map(|deal| deal.state)
    }
}

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
struct Envelope {
    success: bool,
    result: Option<MatchResult>,
}

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
struct MatchResult {
    deal_id: u64,
    matched: Option<bool>,
    price: Option<String>,
}

impl Contract {
    fn deal_or_panic(&self, deal_id: u64) -> Deal {
        self.deals
            .get(&deal_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no such deal"))
    }

    fn escrowed(deal: &Deal) -> NearToken {
        NearToken::from_yoctonear(
            deal.price
                .unwrap_or_else(|| env::panic_str("deal without a price"))
                .0,
        )
    }

    /// The matched price in yoctoNEAR, or None for a no-deal and for anything malformed.
    fn matched_price(&self, deal_id: u64) -> Option<u128> {
        let bytes = env::promise_result_checked(0, MAX_RESULT_BYTES).ok()?;
        let envelope: Envelope = serde_json::from_slice(&bytes).ok()?;
        let result = envelope.result.filter(|_| envelope.success)?;
        if result.deal_id != deal_id || result.matched != Some(true) {
            return None;
        }
        // Canonical Rupiah: digits only, no leading zero (so nonzero), fits u64 like the matcher's.
        let rupiah = result.price?;
        if rupiah.starts_with('0') || !rupiah.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        let rupiah: u64 = rupiah.parse().ok()?;
        Some(u128::from(rupiah) * (YOCTO_PER_NEAR / self.rp_per_near))
    }

    /// The `request_execution` arguments for the matcher; the OutLayer refund goes to the caller who paid.
    fn outlayer_request(&self, deal: &Deal) -> Vec<u8> {
        let hex_all = |v: &[Vec<u8>]| v.iter().map(hex::encode).collect::<Vec<_>>();
        let commits_hex = |v: &[[u8; 32]]| v.iter().map(hex::encode).collect::<Vec<_>>();
        let input = json!({
            "action": "match",
            "deal_id": deal.id,
            "round": deal.round,
            "seller_cts": hex_all(&deal.seller_cts),
            "buyer_cts": hex_all(&deal.buyer_cts),
            "seller_commits": commits_hex(&deal.seller_commits),
            "buyer_commits": commits_hex(&deal.buyer_commits),
        });
        let secrets_owner = self.project_id.split('/').next().unwrap_or_default();
        json!({
            "source": { "Project": { "project_id": self.project_id, "version_key": null } },
            "input_data": input.to_string(),
            "resource_limits": { "max_instructions": 1_000_000_000u64, "max_memory_mb": 128, "max_execution_seconds": 10 },
            "secrets_ref": { "profile": "production", "account_id": secrets_owner },
            "response_format": "Json",
            "payer_account_id": env::predecessor_account_id(),
        })
        .to_string()
        .into_bytes()
    }
}
