// D1-08 spike: encrypt a limit in Node, decrypt it inside an OutLayer testnet execution.
// Needs: SPIKE_ACCOUNT_ID, SPIKE_PRIVATE_KEY (ed25519:...), optional SPIKE_PROJECT.
import { Account } from "near-api-js";
import { encrypt } from "eciesjs";

const accountId = process.env.SPIKE_ACCOUNT_ID;
const key = process.env.SPIKE_PRIVATE_KEY;
if (!accountId || !key) throw new Error("set SPIKE_ACCOUNT_ID and SPIKE_PRIVATE_KEY");
const project = process.env.SPIKE_PROJECT ?? `${accountId}/blind-deal-spike`;

const account = new Account(accountId, "https://rpc.testnet.near.org", key);

// request_execution returns the WASM's stdout parsed as JSON (response_format "Json").
async function execute(input) {
  const out = await account.callFunction({
    contractId: "outlayer.testnet",
    methodName: "request_execution",
    args: {
      source: { Project: { project_id: project, version_key: null } },
      input_data: JSON.stringify(input),
      resource_limits: { max_instructions: 1_000_000_000, max_memory_mb: 128, max_execution_seconds: 10 },
      secrets_ref: { profile: "production", account_id: accountId },
      response_format: "Json",
    },
    deposit: 2_000_100_000_000_000_000_000n, // 0.0020001 NEAR; unused part is refunded
    gas: 300_000_000_000_000n,
  });
  if (!out?.success) throw new Error(`execution failed: ${JSON.stringify(out)}`);
  return out.result;
}

const { pubkey } = await execute({ action: "get_pubkey" });
// eciesjs returns a Uint8Array; hex-encode via Buffer.
const ciphertext = Buffer.from(encrypt(Buffer.from(pubkey, "hex"), Buffer.from('{"limit":"4000000"}'))).toString("hex");
const { plaintext } = await execute({ action: "decrypt", ciphertext });
console.log("decrypted:", plaintext);
