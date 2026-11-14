use libsecp256k1::{PublicKey, SecretKey};
use serde_json::json;
use tee::commit::commit;
use tee::{run_match, MatchInput, Response};

const DEAL: u64 = 7;

fn key() -> SecretKey {
    SecretKey::parse(&[0x22; 32]).unwrap() // test-only key
}

/// Hex ciphertext and commitment for one side's limit in one round.
fn seal(deal_id: u64, side: &str, round: u8, limit: &str) -> (String, String) {
    let salt = "ab".repeat(16);
    let plain =
        json!({ "deal_id": deal_id, "side": side, "round": round, "limit": limit, "salt": salt });
    let pk = PublicKey::from_secret_key(&key()).serialize_compressed();
    let ct = ecies::encrypt(&pk, plain.to_string().as_bytes()).unwrap();
    (
        hex::encode(ct),
        hex::encode(commit(deal_id, side, round, limit, &salt)),
    )
}

/// One `(seller_limit, buyer_limit)` pair per round.
fn input(rounds: &[(&str, &str)]) -> MatchInput {
    let mut i = MatchInput {
        deal_id: DEAL,
        round: rounds.len() as u8,
        seller_cts: vec![],
        buyer_cts: vec![],
        seller_commits: vec![],
        buyer_commits: vec![],
    };
    for (n, (seller, buyer)) in rounds.iter().enumerate() {
        let r = n as u8 + 1;
        let (ct, c) = seal(DEAL, "seller", r, seller);
        i.seller_cts.push(ct);
        i.seller_commits.push(c);
        let (ct, c) = seal(DEAL, "buyer", r, buyer);
        i.buyer_cts.push(ct);
        i.buyer_commits.push(c);
    }
    i
}

#[test]
fn overlap_matches_price_in_range() {
    let i = input(&[("4000000", "4600000")]);
    let mut seen = std::collections::HashSet::new();
    for _ in 0..1000 {
        match run_match(&i, &key()) {
            Response::Matched { deal_id, price } => {
                assert_eq!(deal_id, DEAL);
                assert!((4_000_000..=4_600_000).contains(&price), "price {price}");
                seen.insert(price);
            }
            other => panic!("expected a match, got {other:?}"),
        }
    }
    assert!(seen.len() > 1, "price must be drawn, not fixed");
}

#[test]
fn no_overlap_returns_no_price() {
    let r = run_match(&input(&[("5000000", "4000000")]), &key());
    assert_eq!(r, Response::NoDeal { deal_id: DEAL });
}

#[test]
fn equal_limits_match_exact() {
    let r = run_match(&input(&[("4200000", "4200000")]), &key());
    assert_eq!(
        r,
        Response::Matched {
            deal_id: DEAL,
            price: 4_200_000
        }
    );
}

fn invalid() -> Response {
    Response::Invalid { deal_id: DEAL }
}

#[test]
fn zero_or_nonnumeric_limit_invalid() {
    for bad in ["0", "abc", "-5", "+4000000", "007", " 4000000", ""] {
        assert_eq!(
            run_match(&input(&[(bad, "4600000")]), &key()),
            invalid(),
            "seller {bad:?}"
        );
        assert_eq!(
            run_match(&input(&[("4000000", bad)]), &key()),
            invalid(),
            "buyer {bad:?}"
        );
    }
}

#[test]
fn commit_mismatch_invalid() {
    let mut i = input(&[("4000000", "4600000")]);
    i.seller_commits[0] = hex::encode(commit(DEAL, "seller", 1, "4000001", &"ab".repeat(16)));
    assert_eq!(run_match(&i, &key()), invalid());
    // an earlier round is validated too, not just the latest
    let mut j = input(&[("5000000", "4000000"), ("4500000", "4600000")]);
    j.buyer_commits[0] = hex::encode(commit(DEAL, "buyer", 1, "4000001", &"ab".repeat(16)));
    assert_eq!(run_match(&j, &key()), invalid());
}

#[test]
fn seller_ct_as_buyer_invalid() {
    let mut i = input(&[("4000000", "4600000")]);
    i.buyer_cts[0] = i.seller_cts[0].clone();
    i.buyer_commits[0] = i.seller_commits[0].clone();
    assert_eq!(run_match(&i, &key()), invalid());
}

#[test]
fn wrong_deal_id_invalid() {
    let mut i = input(&[("4000000", "4600000")]);
    (i.seller_cts[0], i.seller_commits[0]) = seal(8, "seller", 1, "4000000");
    (i.buyer_cts[0], i.buyer_commits[0]) = seal(8, "buyer", 1, "4600000");
    assert_eq!(run_match(&i, &key()), invalid());
}

#[test]
fn wrong_round_number_invalid() {
    let mut i = input(&[("4000000", "4600000")]);
    i.round = 2; // one ciphertext per side, two claimed
    assert_eq!(run_match(&i, &key()), invalid());
    i.round = 0;
    assert_eq!(run_match(&i, &key()), invalid());
    let mut k = input(&[("5000000", "4000000"), ("4500000", "4600000")]);
    k.round = 1; // two ciphertexts per side, one claimed
    assert_eq!(run_match(&k, &key()), invalid());
    // a round-2 ciphertext sitting in the round-1 slot, with its own matching commit
    let mut j = input(&[("4000000", "4600000")]);
    (j.seller_cts[0], j.seller_commits[0]) = seal(DEAL, "seller", 2, "4000000");
    (j.buyer_cts[0], j.buyer_commits[0]) = seal(DEAL, "buyer", 2, "4600000");
    assert_eq!(run_match(&j, &key()), invalid());
}

#[test]
fn buyer_lowering_limit_in_later_round_is_nodeal() {
    // Round 2 overlaps ([3.0M, 4.0M]) but the buyer went down from 4.4M.
    let i = input(&[("5000000", "4400000"), ("3000000", "4000000")]);
    assert_eq!(run_match(&i, &key()), Response::NoDeal { deal_id: DEAL });
}

#[test]
fn seller_raising_limit_in_later_round_is_nodeal() {
    // Round 2 overlaps ([4.8M, 5.0M]) but the seller went up from 4.5M.
    let i = input(&[("4500000", "4000000"), ("4800000", "5000000")]);
    assert_eq!(run_match(&i, &key()), Response::NoDeal { deal_id: DEAL });
}

#[test]
fn only_latest_round_compared() {
    // Round 1 had no overlap; both sides concede and round 2 decides.
    let i = input(&[("5000000", "4000000"), ("4500000", "4600000")]);
    match run_match(&i, &key()) {
        Response::Matched { price, .. } => assert!((4_500_000..=4_600_000).contains(&price)),
        other => panic!("expected a match, got {other:?}"),
    }
}
