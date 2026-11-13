use contract::Contract;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;

fn contract() -> Contract {
    testing_env!(VMContextBuilder::new()
        .predecessor_account_id(accounts(1))
        .build());
    Contract::new(
        accounts(0),
        vec![2; 33],
        "spike.testnet/blind-deal".to_string(),
        None,
    )
}

fn create(c: &mut Contract, title: &str, description: &str) -> u64 {
    c.create_deal(title.to_string(), description.to_string(), [7; 32], 2)
}

mod create_deal {
    use super::*;

    #[test]
    fn create_deal_returns_incrementing_ids() {
        let mut c = contract();
        assert_eq!(create(&mut c, "bike", "red"), 0);
        assert_eq!(create(&mut c, "desk", "oak"), 1);
        assert_eq!(c.get_deal(1).unwrap().title, "desk");
    }

    #[test]
    fn title_and_description_length_bounded() {
        let mut c = contract();
        create(&mut c, &"t".repeat(100), &"d".repeat(1000)); // exactly at the limits
        let bad = [
            ("", "ok", "title must be"),
            (&"t".repeat(101), "ok", "title must be"),
            ("ok", &"d".repeat(1001), "description must be"),
        ];
        for (title, description, msg) in bad {
            let mut c = contract();
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                create(&mut c, title, description)
            }));
            let err = result.expect_err("expected a panic");
            let text = err.downcast_ref::<String>().cloned().unwrap_or_default();
            assert!(text.contains(msg), "{text:?} should contain {msg:?}");
        }
    }

    #[test]
    fn get_deal_hides_nothing_secret() {
        let mut c = contract();
        let id = create(&mut c, "bike", "red");
        let json = near_sdk::serde_json::to_value(c.get_deal(id).unwrap()).unwrap();
        let mut keys: Vec<_> = json.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        // No plaintext limit, salt or key field exists; a new field must be added here on purpose.
        assert_eq!(
            keys,
            [
                "buyer",
                "buyer_commits",
                "buyer_cts",
                "deadline_ns",
                "description",
                "id",
                "link_hash",
                "matched_at_ns",
                "matcher_retries",
                "max_rounds",
                "price",
                "round",
                "seller",
                "seller_commits",
                "seller_cts",
                "state",
                "title"
            ]
        );
    }
}
