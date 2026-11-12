use tee::key::{derive_secret_key, public_key_hex};

#[test]
fn derivation_is_stable_and_gives_a_compressed_public_key() {
    // The same master secret must always give the same public key, or deployed ciphertexts break.
    // Expected value recorded from the D1-08 spike for master 0x11 x 32.
    let key = derive_secret_key(&"11".repeat(32)).unwrap();
    assert_eq!(
        public_key_hex(&key),
        "02de8bbf52d409e2a5ad7fe6decb7a2d547626c64ce1d78acb89a6031358c97629"
    );
}

#[test]
fn different_masters_give_different_keys() {
    let a = derive_secret_key(&"11".repeat(32)).unwrap();
    let b = derive_secret_key(&"12".repeat(32)).unwrap();
    assert_ne!(public_key_hex(&a), public_key_hex(&b));
}

#[test]
fn bad_master_secrets_are_rejected() {
    for bad in ["", "zz", "123"] {
        assert!(derive_secret_key(bad).is_err(), "{bad:?}");
    }
}

#[test]
fn derived_key_decrypts_what_is_encrypted_to_its_public_key() {
    let key = derive_secret_key(&"11".repeat(32)).unwrap();
    let pk = hex::decode(public_key_hex(&key)).unwrap();
    let ct = ecies::encrypt(&pk, b"hello").unwrap();
    assert_eq!(ecies::decrypt(&key.serialize(), &ct).unwrap(), b"hello");
}
