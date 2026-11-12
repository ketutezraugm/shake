// Runs the real binary the way OutLayer does: JSON on stdin, JSON on stdout, secret in the env.
use serde_json::{json, Value};
use std::io::Write;
use std::process::{Command, Stdio};
use tee::commit::commit;
use tee::key::{derive_secret_key, public_key_hex};

const MASTER: &str = "1111111111111111111111111111111111111111111111111111111111111111";

fn run(stdin: &str) -> Value {
    let mut child = Command::new(env!("CARGO_BIN_EXE_tee"))
        .env("PROTECTED_DEAL_MASTER_SECRET", MASTER)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(stdin.as_bytes())
        .unwrap();
    let out = child.wait_with_output().unwrap();
    serde_json::from_slice(&out.stdout).unwrap_or_else(|e| panic!("stdout {:?}: {e}", out.stdout))
}

fn seal(side: &str, limit: &str) -> (String, String) {
    let salt = "cd".repeat(16);
    let plain = json!({ "deal_id": 7, "side": side, "round": 1, "limit": limit, "salt": salt });
    let pk = hex::decode(public_key_hex(&derive_secret_key(MASTER).unwrap())).unwrap();
    let ct = ecies::encrypt(&pk, plain.to_string().as_bytes()).unwrap();
    (
        hex::encode(ct),
        hex::encode(commit(7, side, 1, limit, &salt)),
    )
}

#[test]
fn get_pubkey_returns_the_derived_key() {
    let out = run(r#"{"action":"get_pubkey"}"#);
    assert_eq!(out["success"], true);
    assert_eq!(
        out["result"]["pubkey"],
        "02de8bbf52d409e2a5ad7fe6decb7a2d547626c64ce1d78acb89a6031358c97629"
    );
}

#[test]
fn match_answers_inside_the_success_envelope() {
    let (seller_ct, seller_commit) = seal("seller", "4000000");
    let (buyer_ct, buyer_commit) = seal("buyer", "4600000");
    let request = json!({
        "action": "match", "deal_id": 7, "round": 1,
        "seller_cts": [seller_ct], "buyer_cts": [buyer_ct],
        "seller_commits": [seller_commit], "buyer_commits": [buyer_commit],
    });
    let out = run(&request.to_string());
    assert_eq!(out["success"], true);
    assert_eq!(out["result"]["deal_id"], 7);
    assert_eq!(out["result"]["matched"], true);
    let price: u64 = out["result"]["price"].as_str().unwrap().parse().unwrap();
    assert!((4_000_000..=4_600_000).contains(&price));
}

#[test]
fn unknown_actions_and_garbage_are_errors_and_nothing_decrypts_for_callers() {
    for bad in [
        r#"{"action":"decrypt","ciphertext":"00"}"#,
        r#"{"action":"nope"}"#,
        "not json",
        "",
    ] {
        let out = run(bad);
        assert_eq!(out["success"], false, "{bad:?}");
        assert!(out["error"].is_string());
    }
}
