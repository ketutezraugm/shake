// Live check of what a wallet login leaves us with (MK-06), without a wallet popup: the account's own key plays the
// wallet and adds the same limited key connectWallet asks for, then we use that key the way the app will.
// Proves: the relayer accepts requests signed by a function-call key; the key can call create_deal; it cannot carry
// a deposit, which is why payments go through the wallet. Removes the key at the end.
// Run: npx tsx scripts/wallet-key-check.mts   (env: SELLER_ID, CONTRACT_ID)
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Account, KeyPair, type KeyPairString } from "near-api-js";
import { sealLimit } from "../app/src/crypto";
import { nearClient } from "../app/src/nearClient";
import { walletSigner } from "../app/src/walletSigner";
import { createApp } from "../relayer/src/app";
import { FakeStore } from "../relayer/src/fakes";
import { rpcNearReader } from "../relayer/src/near";

const chain = { contractId: process.env.CONTRACT_ID ?? "blind-deal-59xtyh4b.testnet", rpcUrl: "https://test.rpc.fastnear.com" };
const ACCOUNT_ID = process.env.SELLER_ID ?? "rt-seller-3a6ojo95.testnet";
const TEE_PUBKEY = process.env.TEE_PUBKEY ?? "028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e";
const METHODS = ["create_deal", "submit_limit", "cancel", "confirm_received", "refund", "expire"]; // = connectWallet's list

const { private_key } = JSON.parse(readFileSync(join(homedir(), ".near-credentials", "testnet", `${ACCOUNT_ID}.json`), "utf8"));
const owner = new Account(ACCOUNT_ID, chain.rpcUrl, private_key as KeyPairString);

const fcKey = KeyPair.fromRandom("ed25519");
console.log(`adding a function-call key to ${ACCOUNT_ID} (what the wallet does at sign-in)`);
await owner.addFunctionCallAccessKey({
  publicKey: fcKey.getPublicKey().toString(),
  contractId: chain.contractId,
  methodNames: METHODS,
  allowance: 1_000_000_000_000_000_000_000_000n, // 1 NEAR of gas, what connectWallet asks for
});

let failed = false;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok    " : "FAILED"} ${label}`);
  if (!ok) failed = true;
};

try {
  const wallet = {
    getAccounts: async () => [{ accountId: ACCOUNT_ID }],
    signAndSendTransaction: async () => {
      throw new Error("the wallet must not be needed here");
    },
  };
  const signer = walletSigner({ accountId: ACCOUNT_ID, secretKey: fcKey.toString() }, async () => wallet as never, chain);

  // 1. The relayer's own check (view_access_key on chain) accepts the limited key.
  const relayer = createApp({ store: new FakeStore(), near: rpcNearReader(chain.rpcUrl, chain.contractId), allowedOrigin: "*" });
  const body = JSON.stringify({ handle: "walletcheck", displayName: "Wallet check", bio: "", city: "", avatarUrl: null });
  const headers = await signer.signRequest("PUT", "/me/profile", body);
  const response = await relayer.fetch(
    new Request("http://relayer.local/me/profile", { method: "PUT", headers: { "content-type": "application/json", ...headers }, body }),
  );
  check(response.status === 200, `relayer accepts PUT /me/profile signed by the function-call key (status ${response.status})`);

  // 2. The key can make a no-deposit call on the contract, with no wallet involved.
  const dealId = await signer.call("create_deal", { title: "wallet key check", description: "", link_hash: Array(32).fill(0), max_rounds: 1 });
  check(typeof dealId === "number", `create_deal through the function-call key returned deal ${dealId}`);

  // 2b. The seller's first limit on that deal (what createSlots does) also fits a key call: no fee, little gas.
  const sealed = await sealLimit(dealId as number, "seller", 1, "4000000", TEE_PUBKEY);
  await nearClient(signer, chain).submitLimit(dealId as number, sealed.ct, sealed.commit, null);
  const state = (await nearClient(signer, chain).getDeal(dealId as number))?.state;
  check(state === "Waiting", `submit_limit through the function-call key left the deal ${state}`);

  // 3. The same key cannot attach money; the signer must send those through the wallet instead.
  let reason = "";
  try {
    // Bypass the wallet routing on purpose: call the contract with the key and a deposit.
    const keyOnly = new Account(ACCOUNT_ID, chain.rpcUrl, fcKey.toString());
    await keyOnly.callFunction({ contractId: chain.contractId, methodName: "cancel", args: { deal_id: dealId }, deposit: 1n, gas: 30_000_000_000_000n });
  } catch (error) {
    reason = `${(error as Error).name}: ${(error as Error).message}`;
  }
  check(/deposit/i.test(reason), `the function-call key is refused when it tries to attach a deposit (${reason.slice(0, 80)})`);
} finally {
  await owner.deleteKey(fcKey.getPublicKey().toString());
  console.log("function-call key removed");
}
console.log(failed ? "RESULT: FAILED" : "RESULT: ok");
process.exit(failed ? 1 : 0);
