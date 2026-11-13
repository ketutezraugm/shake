mod common;

use common::*;
use contract::State;
use near_sdk::json_types::U128;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;

mod on_outlayer {
    use super::*;

    #[test]
    fn matched_result_sets_matched_price_and_matched_at() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&matched(id, "4300000"));
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!(d.state, State::Matched);
        // Rp 4.3M at the demo rate of Rp 100M per NEAR is 0.043 NEAR.
        assert_eq!(d.price, Some(U128(43_000_000_000_000_000_000_000)));
        assert_eq!(d.matched_at_ns, Some(NOW_NS));
        assert_eq!(d.deadline_ns, None);
    }

    #[test]
    fn no_match_sets_nodeal_without_price() {
        let mut c = new_contract();
        let id = deal(&mut c, 1);
        play_round(&mut c, id, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!(
            (d.state, d.price, d.matched_at_ns),
            (State::NoDeal, None, None)
        );
    }

    #[test]
    fn malformed_result_sets_nodeal() {
        let huge = "340282366920938463463374607431768211455";
        let bad = [
            r#"{"success":true,"result":{"deal_id":0,"matched":true}}"#.to_string(),
            matched(0, "0"),
            matched(0, "abc"),
            matched(0, "-5"),
            matched(0, "+5"),
            matched(0, huge),
            matched(7, "4300000"), // another deal's result
            r#"{"success":true,"result":{"deal_id":0,"error":"invalid"}}"#.to_string(),
        ];
        for result in bad {
            let mut c = new_contract();
            let id = deal(&mut c, 1);
            assert_eq!(id, 0);
            play_round(&mut c, id, Some("tok"));
            callback_context(&result);
            c.on_outlayer_result(id);
            let d = c.get_deal(id).unwrap();
            assert_eq!((d.state, d.price), (State::NoDeal, None), "result {result}");
        }
    }

    #[test]
    fn failed_execution_hands_round_one_back_unused() {
        let mut c = new_contract();
        let id = deal(&mut c, 1);
        play_round(&mut c, id, Some("tok"));
        callback_failed_context();
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!(
            (d.state, d.round, d.matcher_retries),
            (State::Waiting, 1, 1)
        );
        assert!(d.seller_cts.is_empty() && d.buyer_cts.is_empty());
        assert!(d.seller_commits.is_empty() && d.buyer_commits.is_empty());
        assert_eq!(d.buyer, Some(who(BUYER)), "the buyer keeps the slot");

        // Both sides can submit round 1 again, and a match then goes through as usual.
        play_round(&mut c, id, None);
        callback_context(&matched(id, "4300000"));
        c.on_outlayer_result(id);
        assert_eq!(c.get_deal(id).unwrap().state, State::Matched);
    }

    #[test]
    fn an_unparseable_or_unsuccessful_answer_hands_the_round_back_too() {
        for result in ["not json", "{}", r#"{"success":false,"error":"boom"}"#] {
            let mut c = new_contract();
            let id = deal(&mut c, 1);
            play_round(&mut c, id, Some("tok"));
            callback_context(result);
            c.on_outlayer_result(id);
            let d = c.get_deal(id).unwrap();
            assert_eq!(
                (d.state, d.matcher_retries),
                (State::Waiting, 1),
                "result {result}"
            );
        }
    }

    #[test]
    fn failed_execution_in_a_later_round_keeps_the_earlier_rounds() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);
        play_round(&mut c, id, None);
        callback_failed_context();
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!(
            (d.state, d.round, d.matcher_retries),
            (State::Waiting, 2, 1)
        );
        assert_eq!((d.seller_cts.len(), d.buyer_cts.len()), (1, 1));
        assert_eq!((d.seller_commits.len(), d.buyer_commits.len()), (1, 1));

        play_round(&mut c, id, None);
        assert_eq!(c.get_deal(id).unwrap().state, State::Computing);
    }

    #[test]
    fn failures_past_the_cap_count_as_no_deal_again() {
        let mut c = new_contract();
        let id = deal(&mut c, 1);
        play_round(&mut c, id, Some("tok"));
        for retry in 1..=3 {
            callback_failed_context();
            c.on_outlayer_result(id);
            let d = c.get_deal(id).unwrap();
            assert_eq!((d.state, d.matcher_retries), (State::Waiting, retry));
            play_round(&mut c, id, None);
        }
        callback_failed_context();
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!((d.state, d.matcher_retries), (State::NoDeal, 3));
    }

    #[test]
    fn a_matcher_answer_never_counts_as_a_failed_execution() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!((d.state, d.round, d.matcher_retries), (State::Retry, 2, 0));
    }

    #[test]
    fn callback_from_other_account_rejected() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        for other in [OUTLAYER, SELLER, BUYER, OUTSIDER] {
            testing_env!(VMContextBuilder::new()
                .current_account_id(accounts(0))
                .predecessor_account_id(accounts(other))
                .build());
            panics_with("private", || c.on_outlayer_result(id));
        }
        assert_eq!(c.get_deal(id).unwrap().state, State::Computing);
    }
}
