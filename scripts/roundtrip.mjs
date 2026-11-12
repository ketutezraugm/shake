// Real end-to-end check on testnet: create a deal, submit both limits, wait for OutLayer's answer.
// Env: CONTRACT_ID, TEE_PUBKEY. Optional: SELLER_LIMIT and BUYER_LIMIT (default 4000000 and 4600000).
import { encrypt } from "eciesjs";
import { createHash, randomBytes } from "node:crypto";
import { createAccount } from "./testnet.mjs";

const { CONTRACT_ID: contractId, TEE_PUBKEY } = process.env;
if (!contractId || !TEE_PUBKEY) throw new Error("set CONTRACT_ID and TEE_PUBKEY");
const sellerLimit = process.env.SELLER_LIMIT ?? "4000000";
const buyerLimit = process.env.BUYER_LIMIT ?? "4600000";
const FEE = 2_100_000_000_000_000_000_000n; // 0.0021 NEAR, enough for one OutLayer execution
const GAS = 300_000_000_000_000n;
const WAIT_MS = 90_000;

const sha256 = (s) => [...createHash("sha256").update(s).digest()];

/** Ciphertext and commitment for one side's limit, as the contract's number arrays. */
function seal(dealId, side, limit) {
  const salt = randomBytes(16).toString("hex");
  const plain = JSON.stringify({ deal_id: dealId, side, round: 1, limit, salt });
  const ct = Array.from(encrypt(Buffer.from(TEE_PUBKEY, "hex"), Buffer.from(plain)));
  return { ct, commit: sha256(`blind-deal:v1|${dealId}|${side}|1|${limit}|${salt}`) };
}

const [seller, buyer] = await Promise.all([createAccount("rt-seller"), createAccount("rt-buyer")]);
const token = randomBytes(16).toString("hex");
const call = (account, methodName, args, deposit = 0n) =>
  account.callFunction({ contractId, methodName, args, deposit, gas: GAS });

const dealId = await call(seller, "create_deal", {
  title: "roundtrip",
  description: "",
  link_hash: sha256(token),
  max_rounds: 1,
});
const s = seal(dealId, "seller", sellerLimit);
await call(seller, "submit_limit", { deal_id: dealId, ct: s.ct, commit: s.commit, link_token: null });
const b = seal(dealId, "buyer", buyerLimit);
await call(buyer, "submit_limit", { deal_id: dealId, ct: b.ct, commit: b.commit, link_token: token }, FEE);

const started = Date.now();
let deal;
do {
  await new Promise((r) => setTimeout(r, 2000));
  deal = await buyer.provider.callFunction({ contractId, method: "get_deal", args: { deal_id: dealId } });
} while (deal.state === "Computing" && Date.now() - started < WAIT_MS);

if (deal.state === "Matched") {
  const rupiah = BigInt(deal.price) / 10n ** 16n; // demo rate: Rp 100M per NEAR
  const ok = rupiah >= BigInt(sellerLimit) && rupiah <= BigInt(buyerLimit);
  console.log(`state=Matched price in [${sellerLimit},${buyerLimit}] ${ok ? "ok" : "OUT OF RANGE"} (Rp ${rupiah})`);
  if (!ok) process.exitCode = 1;
} else {
  console.log(`state=${deal.state}`);
  if (deal.state === "Computing") process.exitCode = 1;
}
console.log(`waited ${Math.round((Date.now() - started) / 1000)}s after the buyer's submit`);
