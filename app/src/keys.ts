import { KeyPair, type KeyPairString } from "near-api-js";

const STORAGE_KEY = "blind-deal:key";

/** What the rest of the app may send over the network: never the secret half. */
export type Identity = { publicKey: string };

function loadOrCreate(storage: Storage): KeyPair {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved) return KeyPair.fromString(saved as KeyPairString);

  const key = KeyPair.fromRandom("ed25519");
  storage.setItem(STORAGE_KEY, key.toString());
  return key;
}

export function loadIdentity(storage: Storage = localStorage): Identity {
  return { publicKey: loadOrCreate(storage).getPublicKey().toString() };
}

/** For the "Export key" screen only: the browser holds the sole copy of this key. */
export function exportSecretKey(storage: Storage = localStorage): string {
  return loadOrCreate(storage).toString();
}
