// Testnet helpers shared by the deploy and round-trip scripts.
import { Account, KeyPair } from "near-api-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const RPC = "https://test.rpc.fastnear.com"; // the legacy rpc.testnet.near.org rate-limits and is deprecated
const CREDENTIALS = join(homedir(), ".near-credentials", "testnet");

/** Creates a funded testnet account through the faucet and keeps its key outside the repo. */
export async function createAccount(prefix) {
  const accountId = `${prefix}-${Math.random().toString(36).slice(2, 10)}.testnet`;
  const keyPair = KeyPair.fromRandom("ed25519");
  const res = await fetch("https://helper.nearprotocol.com/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newAccountId: accountId, newAccountPublicKey: keyPair.getPublicKey().toString() }),
  });
  if (!res.ok) throw new Error(`faucet refused ${accountId}: ${res.status} ${await res.text()}`);
  mkdirSync(CREDENTIALS, { recursive: true });
  const privateKey = keyPair.toString();
  writeFileSync(join(CREDENTIALS, `${accountId}.json`), JSON.stringify({ account_id: accountId, private_key: privateKey }));
  return new Account(accountId, RPC, privateKey);
}

/** An existing account whose key is in ~/.near-credentials/testnet. */
export function loadAccount(accountId) {
  const { private_key } = JSON.parse(readFileSync(join(CREDENTIALS, `${accountId}.json`), "utf8"));
  return new Account(accountId, RPC, private_key);
}
