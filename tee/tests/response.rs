use serde_json::json;
use tee::Response;

// The contract's callback parses exactly these shapes (contract/src/lib.rs, `matched_price`).
#[test]
fn matched_has_the_price_as_a_decimal_string() {
    let r = Response::Matched {
        deal_id: 7,
        price: 4_300_000,
    };
    assert_eq!(
        r.to_json(),
        json!({ "deal_id": 7, "matched": true, "price": "4300000" })
    );
}

#[test]
fn no_deal_has_no_price() {
    assert_eq!(
        Response::NoDeal { deal_id: 7 }.to_json(),
        json!({ "deal_id": 7, "matched": false })
    );
}

#[test]
fn invalid_is_an_error_marker() {
    assert_eq!(
        Response::Invalid { deal_id: 7 }.to_json(),
        json!({ "deal_id": 7, "error": "invalid" })
    );
}
