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
            "not json".to_string(),
            "{}".to_string(),
            r#"{"success":false,"error":"boom"}"#.to_string(),
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

        let mut c = new_contract();
        let id = deal(&mut c, 1);
        play_round(&mut c, id, Some("tok"));
        callback_failed_context();
        c.on_outlayer_result(id);
        assert_eq!(c.get_deal(id).unwrap().state, State::NoDeal);
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
