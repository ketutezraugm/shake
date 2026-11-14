mod common;

use common::*;
use contract::State;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::get_created_receipts;

mod submit_limit {
    use super::*;

    #[test]
    fn seller_first_moves_to_waiting() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        assert_eq!(c.get_deal(id).unwrap().state, State::Created);
        submit(&mut c, id, SELLER, 0, None);
        let d = c.get_deal(id).unwrap();
        assert_eq!(d.state, State::Waiting);
        assert_eq!(d.seller_cts.len(), 1);
        assert_eq!(d.seller_commits, vec![[9; 32]]);
    }

    #[test]
    fn buyer_needs_matching_token_hash() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        panics_with("link token required", || {
            submit(&mut c, id, BUYER, FEE, None)
        });
        panics_with("invalid link token", || {
            submit(&mut c, id, BUYER, FEE, Some("wrong"))
        });
        submit(&mut c, id, BUYER, FEE, Some("tok"));
        assert_eq!(c.get_deal(id).unwrap().buyer, Some(who(BUYER)));
    }

    #[test]
    fn second_buyer_submit_fails() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        submit(&mut c, id, BUYER, FEE, Some("tok"));
        panics_with("not accepting limits", || {
            submit(&mut c, id, OUTSIDER, FEE, None)
        });
        // and once the round is over the link is bound to the first buyer
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);
        panics_with("only the deal's buyer", || {
            submit(&mut c, id, OUTSIDER, FEE, None)
        });
    }

    #[test]
    fn used_link_rejected() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        submit(&mut c, id, BUYER, FEE, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id); // back to Retry, so only the link and buyer binding can stop a newcomer
        panics_with("only the deal's buyer", || {
            submit(&mut c, id, OUTSIDER, FEE, Some("tok"))
        });
        assert_eq!(c.get_deal(id).unwrap().buyer, Some(who(BUYER)));
    }

    #[test]
    fn buyer_cannot_go_before_the_seller() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        panics_with("seller submits first", || {
            submit(&mut c, id, BUYER, 0, Some("tok"))
        });
    }

    #[test]
    fn max_rounds_outside_1_to_3_rejected() {
        let mut c = new_contract();
        for bad in [0, 4] {
            panics_with("max_rounds must be 1-3", || {
                deal(&mut c, bad);
            });
        }
        for ok in [1, 3] {
            deal(&mut c, ok);
        }
    }

    #[test]
    fn completing_call_without_fee_rejected() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        panics_with("attach the OutLayer fee", || {
            submit(&mut c, id, BUYER, 0, Some("tok"))
        });
        let d = c.get_deal(id).unwrap();
        assert_eq!(d.state, State::Waiting);
        assert_eq!(d.round, 1);
    }

    #[test]
    fn oversized_ciphertext_rejected() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        at(SELLER, 0);
        panics_with("ciphertext too large", || {
            c.submit_limit(id, vec![1; 513], [9; 32], None)
        });
        c.submit_limit(id, vec![1; 512], [9; 32], None);
        assert_eq!(c.get_deal(id).unwrap().seller_cts[0].len(), 512);
    }

    #[test]
    fn one_submit_per_side_per_round() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        panics_with("already submitted", || submit(&mut c, id, SELLER, 0, None));
        assert_eq!(c.get_deal(id).unwrap().seller_cts.len(), 1);
    }

    #[test]
    fn buyer_submit_moves_to_computing_and_calls_outlayer() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        submit(&mut c, id, BUYER, FEE, Some("tok"));
        assert_eq!(c.get_deal(id).unwrap().state, State::Computing);

        let receipts = get_created_receipts();
        let call = |receiver| {
            let r = receipts
                .iter()
                .find(|r| r.receiver_id == receiver)
                .expect("receipt");
            match &r.actions[0] {
                MockAction::FunctionCallWeight {
                    method_name,
                    args,
                    attached_deposit,
                    ..
                } => (
                    String::from_utf8(method_name.clone()).unwrap(),
                    near_sdk::serde_json::from_slice::<near_sdk::serde_json::Value>(args).unwrap(),
                    attached_deposit.as_yoctonear(),
                ),
                other => panic!("unexpected action {other:?}"),
            }
        };

        let (method, args, deposit) = call(who(OUTLAYER));
        assert_eq!(method, "request_execution");
        assert_eq!(deposit, FEE);
        assert_eq!(args["source"]["Project"]["project_id"], PROJECT);
        assert_eq!(args["secrets_ref"]["account_id"], "spike.testnet");
        assert_eq!(args["secrets_ref"]["profile"], "production");
        assert_eq!(args["response_format"], "Json");
        assert_eq!(args["payer_account_id"], who(BUYER).as_str());
        let input: near_sdk::serde_json::Value =
            near_sdk::serde_json::from_str(args["input_data"].as_str().unwrap()).unwrap();
        assert_eq!(input["action"], "match");
        assert_eq!(input["deal_id"], id);
        assert_eq!(input["round"], 1);
        assert_eq!(input["seller_cts"][0], "01".repeat(10));
        assert_eq!(input["buyer_commits"][0], "09".repeat(32));

        let (method, args, _) = call(who(0));
        assert_eq!(method, "on_outlayer_result");
        assert_eq!(args["deal_id"], id);
    }

    #[test]
    fn nodeal_with_rounds_left_moves_to_retry() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);
        let d = c.get_deal(id).unwrap();
        assert_eq!((d.state, d.round), (State::Retry, 2));
    }

    #[test]
    fn nodeal_on_last_round_is_final() {
        let mut c = new_contract();
        let one = deal(&mut c, 1);
        play_round(&mut c, one, Some("tok"));
        callback_context(&no_deal(one));
        c.on_outlayer_result(one);
        assert_eq!(c.get_deal(one).unwrap().state, State::NoDeal);

        let two = deal(&mut c, 2);
        play_round(&mut c, two, Some("tok"));
        callback_context(&no_deal(two));
        c.on_outlayer_result(two);
        play_round(&mut c, two, None);
        callback_context(&no_deal(two));
        c.on_outlayer_result(two);
        let d = c.get_deal(two).unwrap();
        assert_eq!((d.state, d.round), (State::NoDeal, 2));
    }

    #[test]
    fn round_two_accepts_either_side_first_and_sends_both_rounds() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&no_deal(id));
        c.on_outlayer_result(id);

        submit(&mut c, id, BUYER, 0, None); // the buyer goes first this time
        assert_eq!(c.get_deal(id).unwrap().state, State::Waiting);
        submit(&mut c, id, SELLER, FEE, None);
        assert_eq!(c.get_deal(id).unwrap().state, State::Computing);

        let receipts = get_created_receipts();
        let outlayer = receipts
            .iter()
            .find(|r| r.receiver_id == who(OUTLAYER))
            .expect("receipt");
        let MockAction::FunctionCallWeight { args, .. } = &outlayer.actions[0] else {
            panic!()
        };
        let args: near_sdk::serde_json::Value = near_sdk::serde_json::from_slice(args).unwrap();
        assert_eq!(args["payer_account_id"], who(SELLER).as_str());
        let input: near_sdk::serde_json::Value =
            near_sdk::serde_json::from_str(args["input_data"].as_str().unwrap()).unwrap();
        assert_eq!(input["round"], 2);
        assert_eq!(input["seller_cts"].as_array().unwrap().len(), 2);
        assert_eq!(input["buyer_commits"].as_array().unwrap().len(), 2);
    }
}

mod cancel {
    use super::*;

    #[test]
    fn seller_can_cancel_before_both_sides_have_submitted() {
        let mut c = new_contract();
        let fresh = deal(&mut c, 2);
        at(SELLER, 0);
        c.cancel(fresh);
        assert_eq!(c.get_deal(fresh).unwrap().state, State::NoDeal);

        let waiting = deal(&mut c, 2);
        submit(&mut c, waiting, SELLER, 0, None);
        at(SELLER, 0);
        c.cancel(waiting);
        assert_eq!(c.get_deal(waiting).unwrap().state, State::NoDeal);
    }

    #[test]
    fn only_the_seller_can_cancel() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        submit(&mut c, id, SELLER, 0, None);
        for other in [BUYER, OUTSIDER] {
            at(other, 0);
            panics_with("only the seller", || c.cancel(id));
        }
        assert_eq!(c.get_deal(id).unwrap().state, State::Waiting);
    }

    #[test]
    fn cancel_blocked_once_computing() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        at(SELLER, 0);
        panics_with("too late", || c.cancel(id));
        assert_eq!(c.get_deal(id).unwrap().state, State::Computing);
    }

    #[test]
    fn cancel_blocked_once_matched() {
        let mut c = new_contract();
        let id = deal(&mut c, 2);
        play_round(&mut c, id, Some("tok"));
        callback_context(&matched(id, "4300000"));
        c.on_outlayer_result(id);
        at(SELLER, 0);
        panics_with("too late", || c.cancel(id));
        assert_eq!(c.get_deal(id).unwrap().state, State::Matched);
    }
}
