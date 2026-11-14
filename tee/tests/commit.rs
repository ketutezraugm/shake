use tee::commit::commit;

// Expected value computed independently: sha256 of the canonical string below, with Node's crypto.
#[test]
fn commit_is_sha256_of_canonical_string() {
    let c = commit(
        7,
        "seller",
        2,
        "4000000",
        "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    );
    assert_eq!(
        hex::encode(c),
        "ddc2ed25c9fb3d8a1828a9bd90ac87a96f0f1d07a3c3bf09cf0ee12a673b8a5c"
    );
}

#[test]
fn commit_changes_with_every_field() {
    let base = commit(7, "seller", 2, "4000000", "aa");
    assert_ne!(base, commit(8, "seller", 2, "4000000", "aa"));
    assert_ne!(base, commit(7, "buyer", 2, "4000000", "aa"));
    assert_ne!(base, commit(7, "seller", 3, "4000000", "aa"));
    assert_ne!(base, commit(7, "seller", 2, "4000001", "aa"));
    assert_ne!(base, commit(7, "seller", 2, "4000000", "ab"));
}
