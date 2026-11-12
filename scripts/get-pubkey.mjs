// Prints the TEE's deal public key by running `get_pubkey` on OutLayer (testnet).
// Needs ACCOUNT_ID and PRIVATE_KEY (ed25519:...) of any funded testnet account, and
// OUTLAYER_PROJECT (owner.testnet/name; default: that account's blind-deal).
import { Account } from "near-api-js";
import { RPC } from "./testnet.mjs";

const accountId = process.env.ACCOUNT_ID;
const key = process.env.PRIVATE_KEY;
if (!accountId || !key) throw new Error("set ACCOUNT_ID and PRIVATE_KEY");
const project = process.env.OUTLAYER_PROJECT ?? `${accountId}/blind-deal`;
const [secretsOwner] = project.split("/");

const account = new Account(accountId, RPC, key);
// The fee below is a generous deposit; OutLayer refunds what the run does not use.
const out = await account.callFunction({
  contractId: "outlayer.testnet",
  methodName: "request_execution",
  args: {
    source: { Project: { project_id: project, version_key: null } },
    input_data: JSON.stringify({ action: "get_pubkey" }),
    resource_limits: { max_instructions: 1_000_000_000, max_memory_mb: 128, max_execution_seconds: 10 },
    secrets_ref: { profile: "production", account_id: secretsOwner },
    response_format: "Json",
  },
  deposit: 2_100_000_000_000_000_000_000n,
  gas: 300_000_000_000_000n,
  waitUntil: "FINAL",
});
if (!out?.success) throw new Error(`execution failed: ${JSON.stringify(out)}`);
console.log("pubkey:", out.result.pubkey);
