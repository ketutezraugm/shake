// OutLayer entry point: one JSON request on stdin, one JSON answer on stdout.
use serde::Deserialize;
use serde_json::json;
use std::io::{self, Read};
use tee::key::{derive_secret_key, public_key_hex};
use tee::{run_match, MatchInput};

#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Request {
    GetPubkey,
    Match(MatchInput),
}

fn run(raw: &str) -> Result<serde_json::Value, String> {
    let request: Request = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    let master =
        std::env::var("PROTECTED_DEAL_MASTER_SECRET").map_err(|_| "master secret not set")?;
    let key = derive_secret_key(&master)?;
    Ok(match request {
        Request::GetPubkey => json!({ "pubkey": public_key_hex(&key) }),
        Request::Match(input) => run_match(&input, &key).to_json(),
    })
}

fn main() {
    let mut raw = String::new();
    let answer = match io::stdin()
        .read_to_string(&mut raw)
        .map_err(|e| e.to_string())
        .and_then(|_| run(&raw))
    {
        Ok(result) => json!({ "success": true, "result": result }),
        Err(error) => json!({ "success": false, "error": error }),
    };
    print!("{answer}");
}
