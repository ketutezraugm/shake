// Read-only P-04 freeze check: the deployed contract, the TEE WASM and the README agree, and the test contract is gone.
// Run: npx tsx scripts/freeze-check.mts   Env (optional): CONTRACT_ID, TEST_CONTRACT_ID, TEE_WASM_SHA256, TEE_WASM_URL.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const RPC = "https://test.rpc.fastnear.com";
const CONTRACT_ID = process.env.CONTRACT_ID ?? "blind-deal-1wxklib7.testnet";
const TEST_CONTRACT_ID = process.env.TEST_CONTRACT_ID ?? "blind-deal-w49onlq9.testnet";
// The locked matcher build and where OutLayer serves it (docs/DECISIONS.md).
const TEE_SHA = process.env.TEE_WASM_SHA256 ?? "789705434c9498d88c739cd5e28b5331cf6ff44c2a1dad5f2a9e435d3479b904";
const TEE_URL =
  process.env.TEE_WASM_URL ?? `https://test.fastfs.io/spike-82nkvzn7.testnet/outlayer.testnet/${TEE_SHA}.wasm`;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
let failed = false;
const report = (ok: boolean, line: string) => {
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
};

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58ToHex(text: string): string {
  let n = 0n;
  for (const char of text) n = n * 58n + BigInt(BASE58.indexOf(char));
  return n.toString(16).padStart(64, "0");
}

async function codeHash(accountId: string): Promise<string | null> {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "freeze", method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
  });
  const { result } = (await response.json()) as { result?: { code_hash?: string } };
  return result?.code_hash ? base58ToHex(result.code_hash) : null;
}

const chainHash = await codeHash(CONTRACT_ID);
report(chainHash !== null && !/^0+$/.test(chainHash), `contract ${CONTRACT_ID} has code on chain: sha256 ${chainHash ?? "(account not found)"}`);

const localBuild = "target/wasm32-unknown-unknown/release/contract.wasm";
if (existsSync(localBuild)) {
  const local = sha256(readFileSync(localBuild));
  // A plain cargo build is not reproducible across machines, so a mismatch is a note, not a failure.
  console.log(`note local build ${local === chainHash ? "matches" : "differs from"} the chain (${local})`);
}

const tee = new Uint8Array(await (await fetch(TEE_URL)).arrayBuffer());
report(sha256(tee) === TEE_SHA, `TEE WASM served at FastFS hashes to the locked ${TEE_SHA.slice(0, 12)}...`);

if (existsSync("README.md")) {
  const readme = readFileSync("README.md", "utf8");
  report(readme.includes(CONTRACT_ID), "README names the contract id");
  report(!!chainHash && readme.includes(chainHash), "README carries the contract's WASM hash");
  report(readme.includes(TEE_SHA), "README carries the TEE WASM hash");
} else {
  console.log("note README.md not written yet (P-01); rerun after it lands");
}

// git grep exits 1 when nothing matches, which is the good case.
const stray = spawnSync("git", ["grep", "-l", TEST_CONTRACT_ID, "--", "app", "relayer", "scripts", ".env.example", "README.md"], { encoding: "utf8" })
  .stdout.split("\n")
  .filter((file) => file && file !== "scripts/freeze-check.mts");
report(stray.length === 0, `test contract ${TEST_CONTRACT_ID} is not referenced in shipped code${stray.length ? `: ${stray.join(", ")}` : ""}`);

console.log(`\nManual step (cannot be read from chain): drop the test contract from the secret's readers:\n  outlayer secrets access --project spike-82nkvzn7.testnet/blind-deal --profile production --access allow-all --via ${CONTRACT_ID} --build ${TEE_SHA}`);
process.exit(failed ? 1 : 0);
