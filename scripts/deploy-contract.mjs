// Builds the deal contract and deploys it to testnet, then calls `new`.
// Env: TEE_PUBKEY (hex, from scripts/get-pubkey.mjs), OUTLAYER_PROJECT (owner.testnet/name),
// optional CONTRACT_ID to redeploy to an existing account whose key is in ~/.near-credentials.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createAccount, loadAccount } from "./testnet.mjs";

const { TEE_PUBKEY, OUTLAYER_PROJECT, CONTRACT_ID } = process.env;
if (!TEE_PUBKEY || !OUTLAYER_PROJECT) throw new Error("set TEE_PUBKEY and OUTLAYER_PROJECT");

execFileSync("cargo", ["build", "-p", "contract", "--target", "wasm32-unknown-unknown", "--release"], {
  stdio: "inherit",
});
const wasm = readFileSync("target/wasm32-unknown-unknown/release/contract.wasm");

const account = CONTRACT_ID ? loadAccount(CONTRACT_ID) : await createAccount("blind-deal");
await account.deployContract(wasm);
await account.callFunction({
  contractId: account.accountId,
  methodName: "new",
  args: { outlayer: "outlayer.testnet", tee_pubkey: [...Buffer.from(TEE_PUBKEY, "hex")], project_id: OUTLAYER_PROJECT },
});
console.log(`CONTRACT_ID=${account.accountId} (${wasm.length} bytes)`);
