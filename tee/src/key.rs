use hkdf::Hkdf;
use libsecp256k1::{PublicKey, SecretKey};
use sha2::Sha256;

/// The deal key pair's secret half: HKDF-SHA256 of the hex master secret held in the TEE.
pub fn derive_secret_key(master_hex: &str) -> Result<SecretKey, String> {
    let master = hex::decode(master_hex).map_err(|e| e.to_string())?;
    if master.is_empty() {
        return Err("master secret is empty".into());
    }
    let mut seed = [0u8; 32];
    Hkdf::<Sha256>::new(None, &master)
        .expand(b"blind-deal:ecies", &mut seed)
        .map_err(|e| e.to_string())?;
    SecretKey::parse_slice(&seed).map_err(|e| format!("{e:?}"))
}

/// Compressed public key (33 bytes) as hex; this is what browsers encrypt to.
pub fn public_key_hex(key: &SecretKey) -> String {
    hex::encode(PublicKey::from_secret_key(key).serialize_compressed())
}
