// D1-08 spike: proves a PROTECTED_ secret can derive an ECIES key inside OutLayer.
// `decrypt` echoes plaintext for the spike only; the real matcher never returns limits.
use hkdf::Hkdf;
use serde::Deserialize;
use sha2::Sha256;
use std::io::{self, Read};

#[derive(Deserialize)]
struct Input {
    action: String,
    ciphertext: Option<String>,
}

fn keypair() -> Result<(libsecp256k1::SecretKey, libsecp256k1::PublicKey), String> {
    let secret = std::env::var("PROTECTED_DEAL_MASTER_SECRET").map_err(|_| "master secret not set")?;
    let master = hex::decode(secret).map_err(|e| e.to_string())?;
    let mut seed = [0u8; 32];
    Hkdf::<Sha256>::new(None, &master)
        .expand(b"blind-deal:ecies", &mut seed)
        .map_err(|e| e.to_string())?;
    let sk = libsecp256k1::SecretKey::parse_slice(&seed).map_err(|e| format!("{e:?}"))?;
    let pk = libsecp256k1::PublicKey::from_secret_key(&sk);
    Ok((sk, pk))
}

fn run(input: Input) -> Result<serde_json::Value, String> {
    let (sk, pk) = keypair()?;
    match input.action.as_str() {
        "get_pubkey" => Ok(serde_json::json!({ "pubkey": hex::encode(pk.serialize_compressed()) })),
        "decrypt" => {
            let ct = hex::decode(input.ciphertext.ok_or("ciphertext missing")?).map_err(|e| e.to_string())?;
            let pt = ecies::decrypt(&sk.serialize(), &ct).map_err(|e| format!("{e:?}"))?;
            Ok(serde_json::json!({ "plaintext": String::from_utf8_lossy(&pt) }))
        }
        other => Err(format!("unknown action {other}")),
    }
}

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).expect("stdin");
    let out = match serde_json::from_str::<Input>(&raw).map_err(|e| e.to_string()).and_then(run) {
        Ok(v) => serde_json::json!({ "success": true, "result": v }),
        Err(e) => serde_json::json!({ "success": false, "error": e }),
    };
    print!("{out}");
}
