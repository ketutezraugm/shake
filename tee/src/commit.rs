use sha2::{Digest, Sha256};

/// Binds a limit to its deal, side and round. The frontend hashes the same string.
pub fn commit(deal_id: u64, side: &str, round: u8, limit: &str, salt_hex: &str) -> [u8; 32] {
    let canonical = format!("blind-deal:v1|{deal_id}|{side}|{round}|{limit}|{salt_hex}");
    Sha256::digest(canonical.as_bytes()).into()
}
