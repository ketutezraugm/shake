// OutLayer WASM: decrypt, compare, draw price. Shapes: docs/ARCHITECTURE.md.
pub mod commit;

use libsecp256k1::SecretKey;
use rand::Rng;
use serde::Deserialize;

/// `input_data` of the `match` action. Ciphertexts and commitments are hex, one per round.
#[derive(Deserialize)]
pub struct MatchInput {
    pub deal_id: u64,
    pub round: u8,
    pub seller_cts: Vec<String>,
    pub buyer_cts: Vec<String>,
    pub seller_commits: Vec<String>,
    pub buyer_commits: Vec<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Response {
    Matched { deal_id: u64, price: u64 },
    NoDeal { deal_id: u64 },
    Invalid { deal_id: u64 },
}

#[derive(Deserialize)]
struct Plain {
    deal_id: u64,
    side: String,
    round: u8,
    limit: String,
    salt: String,
}

/// Canonical decimal: digits only, no leading zero (so also nonzero), fits u64.
fn parse_limit(s: &str) -> Option<u64> {
    if s.starts_with('0') || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    s.parse().ok()
}

/// Decrypts one slot and returns its limit only if it belongs to this deal, side and round
/// and matches the on-chain commitment.
fn open(
    ct_hex: &str,
    commit_hex: &str,
    key: &SecretKey,
    deal_id: u64,
    side: &str,
    round: u8,
) -> Option<u64> {
    let ct = hex::decode(ct_hex).ok()?;
    let plain: Plain = serde_json::from_slice(&ecies::decrypt(&key.serialize(), &ct).ok()?).ok()?;
    if plain.deal_id != deal_id || plain.side != side || plain.round != round {
        return None;
    }
    let expected = commit::commit(deal_id, side, round, &plain.limit, &plain.salt);
    if hex::decode(commit_hex).ok()?.as_slice() != expected {
        return None;
    }
    parse_limit(&plain.limit)
}

/// Opens every round of one side; there must be exactly one ciphertext and commitment per round.
fn open_all(
    cts: &[String],
    commits: &[String],
    key: &SecretKey,
    deal_id: u64,
    side: &str,
    rounds: u8,
) -> Option<Vec<u64>> {
    let n = usize::from(rounds);
    if n == 0 || cts.len() != n || commits.len() != n {
        return None;
    }
    (0..n)
        .map(|i| open(&cts[i], &commits[i], key, deal_id, side, i as u8 + 1))
        .collect()
}

pub fn run_match(input: &MatchInput, key: &SecretKey) -> Response {
    let deal_id = input.deal_id;
    let seller = open_all(
        &input.seller_cts,
        &input.seller_commits,
        key,
        deal_id,
        "seller",
        input.round,
    );
    let buyer = open_all(
        &input.buyer_cts,
        &input.buyer_commits,
        key,
        deal_id,
        "buyer",
        input.round,
    );
    let (Some(seller), Some(buyer)) = (seller, buyer) else {
        return Response::Invalid { deal_id };
    };
    // Concessions only: the buyer never lowers and the seller never raises. A violation is a no-deal.
    let conceding =
        seller.windows(2).all(|w| w[1] <= w[0]) && buyer.windows(2).all(|w| w[1] >= w[0]);
    let (seller_min, buyer_max) = (seller[seller.len() - 1], buyer[buyer.len() - 1]);
    if !conceding || seller_min > buyer_max {
        return Response::NoDeal { deal_id };
    }
    Response::Matched {
        deal_id,
        price: rand::rng().random_range(seller_min..=buyer_max),
    }
}
