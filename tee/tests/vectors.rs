// tee/testvectors.json is shared with the frontend (app/src/crypto.test.ts): the ciphertexts there
// were produced by eciesjs, so this also proves the JS and Rust sides agree.
use libsecp256k1::SecretKey;
use serde::Deserialize;
use tee::commit::commit;
use tee::{run_match, MatchInput, Response};

#[derive(Deserialize)]
struct Vectors {
    test_secret_key: String,
    vectors: Vec<Vector>,
}

#[derive(Deserialize)]
struct Vector {
    deal_id: u64,
    side: String,
    round: u8,
    limit: String,
    salt: String,
    commit: String,
    ciphertext: String,
}

fn load() -> (SecretKey, Vec<Vector>) {
    let v: Vectors = serde_json::from_str(include_str!("../testvectors.json")).unwrap();
    let key = SecretKey::parse_slice(&hex::decode(v.test_secret_key).unwrap()).unwrap();
    (key, v.vectors)
}

#[test]
fn vector_ciphertexts_decrypt_and_commits_match() {
    let (key, vectors) = load();
    assert!(vectors.len() >= 2, "need a seller and a buyer vector");
    for v in &vectors {
        let plain = ecies::decrypt(&key.serialize(), &hex::decode(&v.ciphertext).unwrap()).unwrap();
        let plain: serde_json::Value = serde_json::from_slice(&plain).unwrap();
        assert_eq!(plain["deal_id"], v.deal_id);
        assert_eq!(plain["side"], v.side.as_str());
        assert_eq!(plain["round"], v.round);
        assert_eq!(plain["limit"], v.limit.as_str());
        assert_eq!(plain["salt"], v.salt.as_str());
        assert_eq!(
            hex::encode(commit(v.deal_id, &v.side, v.round, &v.limit, &v.salt)),
            v.commit
        );
    }
}

#[test]
fn vectors_run_through_the_matcher() {
    let (key, vectors) = load();
    let side = |s: &str| vectors.iter().find(|v| v.side == s).unwrap();
    let (seller, buyer) = (side("seller"), side("buyer"));
    let input = MatchInput {
        deal_id: seller.deal_id,
        round: 1,
        seller_cts: vec![seller.ciphertext.clone()],
        buyer_cts: vec![buyer.ciphertext.clone()],
        seller_commits: vec![seller.commit.clone()],
        buyer_commits: vec![buyer.commit.clone()],
    };
    let (lo, hi): (u64, u64) = (seller.limit.parse().unwrap(), buyer.limit.parse().unwrap());
    match run_match(&input, &key) {
        Response::Matched { price, .. } => assert!((lo..=hi).contains(&price)),
        other => panic!("expected a match, got {other:?}"),
    }
}
