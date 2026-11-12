mod common;

use common::*;
use contract::{Contract, State};
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::get_created_receipts;

/// The yocto amount of every Transfer receipt to `to`.
fn transfers_to(to: usize) -> Vec<u128> {
    get_created_receipts()
        .iter()
        .filter(|r| r.receiver_id == who(to))
        .flat_map(|r| r.actions.iter())
        .filter_map(|a| match a {
            MockAction::Transfer { deposit, .. } => Some(deposit.as_yoctonear()),
            _ => None,
        })
        .collect()
}

fn funded_deal(c: &mut Contract) -> u64 {
    let id = matched_deal(c);
    at_time(BUYER, PRICE, NOW_NS + 1);
    c.deposit(id);
    id
}

mod escrow {
    use super::*;

    #[test]
    fn deposit_exact_price_funds() {
        let mut c = new_contract();
        let id = matched_deal(&mut c);
        assert_eq!(c.get_deal(id).unwrap().price, Some(U128(PRICE)));
        at_time(BUYER, PRICE, NOW_NS + 1_000);
        c.deposit(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!(d.state, State::Funded);
        assert_eq!(d.deadline_ns, Some(NOW_NS + 1_000 + 7 * DAY_NS));
    }

    #[test]
    fn deposit_wrong_amount_panics() {
        let mut c = new_contract();
        let id = matched_deal(&mut c);
        for wrong in [0, PRICE - 1, PRICE + 1] {
            at(BUYER, wrong);
            panics_with("exactly the price", || c.deposit(id));
        }
        assert_eq!(c.get_deal(id).unwrap().state, State::Matched);
    }

    #[test]
    fn deposit_wrong_caller_panics() {
        let mut c = new_contract();
        let id = matched_deal(&mut c);
        for other in [SELLER, OUTSIDER] {
            at(other, PRICE);
            panics_with("only the buyer", || c.deposit(id));
        }
        // and only while the deal is matched
        let fresh = deal(&mut c, 2);
        at(BUYER, PRICE);
        panics_with("not matched", || c.deposit(fresh));
        let funded = funded_deal(&mut c);
        at(BUYER, PRICE);
        panics_with("not matched", || c.deposit(funded));
    }

    #[test]
    fn confirm_received_pays_seller() {
        let mut c = new_contract();
        let id = funded_deal(&mut c);
        at(BUYER, 0);
        drop(c.confirm_received(id));
        assert_eq!(c.get_deal(id).unwrap().state, State::Released);
        assert_eq!(transfers_to(SELLER), vec![PRICE]);
        at(BUYER, 0);
        panics_with("not funded", || {
            drop(c.confirm_received(id));
        }); // no second payout
    }

    #[test]
    fn confirm_wrong_caller_or_state_panics() {
        let mut c = new_contract();
        let matched = matched_deal(&mut c);
        at(BUYER, 0);
        panics_with("not funded", || {
            drop(c.confirm_received(matched));
        });
        let id = funded_deal(&mut c);
        for other in [SELLER, OUTSIDER] {
            at(other, 0);
            panics_with("only the buyer", || {
                drop(c.confirm_received(id));
            });
        }
        assert_eq!(c.get_deal(id).unwrap().state, State::Funded);
    }

    #[test]
    fn refund_after_deadline_pays_buyer() {
        let mut c = new_contract();
        let id = funded_deal(&mut c);
        let deadline = c.get_deal(id).unwrap().deadline_ns.unwrap();
        at_time(OUTSIDER, 0, deadline + 1); // anyone may trigger it
        drop(c.refund(id));
        assert_eq!(c.get_deal(id).unwrap().state, State::Refunded);
        assert_eq!(transfers_to(BUYER), vec![PRICE]);
    }

    #[test]
    fn refund_before_deadline_panics() {
        let mut c = new_contract();
        let id = funded_deal(&mut c);
        let deadline = c.get_deal(id).unwrap().deadline_ns.unwrap();
        at_time(BUYER, 0, deadline);
        panics_with("deadline", || {
            drop(c.refund(id));
        });
        assert_eq!(c.get_deal(id).unwrap().state, State::Funded);
    }

    #[test]
    fn expire_after_24h_unfunded() {
        let mut c = new_contract();
        let id = matched_deal(&mut c);
        at_time(OUTSIDER, 0, NOW_NS + DAY_NS);
        panics_with("too early", || c.expire(id));
        at_time(OUTSIDER, 0, NOW_NS + DAY_NS + 1);
        c.expire(id);
        assert_eq!(c.get_deal(id).unwrap().state, State::NoDeal);
        at(BUYER, PRICE);
        panics_with("not matched", || c.deposit(id));
    }

    #[test]
    fn get_state_returns_state_or_null() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        assert_eq!(c.get_state(id), Some(State::Created));
        assert_eq!(c.get_state(99), None);
    }

    #[test]
    fn no_owner_method_exists() {
        // Every public method of the contract, read from the source. A new one must be added here
        // on purpose, which is the moment to ask whether it is an admin power.
        let methods: Vec<&str> = include_str!("../src/lib.rs")
            .lines()
            .filter_map(|l| l.strip_prefix("    pub fn "))
            .filter_map(|l| l.split(['(', '<']).next())
            .collect();
        assert_eq!(
            methods,
            [
                "new",
                "create_deal",
                "submit_limit",
                "on_outlayer_result",
                "deposit",
                "confirm_received",
                "refund",
                "cancel",
                "expire",
                "get_deal",
                "get_state"
            ]
        );
    }
}
