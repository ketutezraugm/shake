// Real end-to-end check on testnet: create a deal, submit both limits, wait for OutLayer's answer.
// Env: CONTRACT_ID, TEE_PUBKEY. Optional: SELLER_LIMIT and BUYER_LIMIT (default 4000000 and 4600000),
// SELLER_ID and BUYER_ID to reuse funded accounts from ~/.near-credentials (the faucet rate-limits new ones).
// With --escrow it also pays a matched deal into escrow and releases it, then funds a second one and
// refunds it after the deadline; that needs a contract deployed with DELIVERY_WINDOW_SECS=30.
import { encrypt } from "eciesjs";
import { createHash, randomBytes } from "node:crypto";
import { createAccount, loadAccount } from "./testnet.mjs";

const { CONTRACT_ID: contractId, TEE_PUBKEY } = process.env;
if (!contractId || !TEE_PUBKEY) throw new Error("set CONTRACT_ID and TEE_PUBKEY");
const sellerLimit = process.env.SELLER_LIMIT ?? "4000000";
const buyerLimit = process.env.BUYER_LIMIT ?? "4600000";
const escrow = process.argv.includes("--escrow");
const FEE = 2_100_000_000_000_000_000_000n; // 0.0021 NEAR, enough for one OutLayer execution
const GAS = 300_000_000_000_000n;
const WAIT_MS = 90_000;
const MAX_REFUND_WAIT_S = 120;

const sha256 = (s) => [...createHash("sha256").update(s).digest()];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ciphertext and commitment for one side's limit, as the contract's number arrays. */
function seal(dealId, side, limit) {
  const salt = randomBytes(16).toString("hex");
  const plain = JSON.stringify({ deal_id: dealId, side, round: 1, limit, salt });
  const ct = Array.from(encrypt(Buffer.from(TEE_PUBKEY, "hex"), Buffer.from(plain)));
  return { ct, commit: sha256(`blind-deal:v1|${dealId}|${side}|1|${limit}|${salt}`) };
}

const call = (account, methodName, args, deposit = 0n) =>
  account.callFunction({ contractId, methodName, args, deposit, gas: GAS });
const getDeal = (account, dealId) =>
  account.provider.callFunction({ contractId, method: "get_deal", args: { deal_id: dealId } });

/** Plays one single-round deal and returns its final state once OutLayer has answered. */
async function playDeal(seller, buyer) {
  const token = randomBytes(16).toString("hex");
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
    await sleep(2000);
    deal = await getDeal(buyer, dealId);
  } while (deal.state === "Computing" && Date.now() - started < WAIT_MS);
  return { dealId, deal, waitedS: Math.round((Date.now() - started) / 1000) };
}

const rupiahOf = (price) => BigInt(price) / 10n ** 16n; // demo rate: Rp 100M per NEAR
const fail = (message) => {
  console.log(message);
  process.exitCode = 1;
};

const { SELLER_ID, BUYER_ID } = process.env;
const [seller, buyer] =
  SELLER_ID && BUYER_ID
    ? [loadAccount(SELLER_ID), loadAccount(BUYER_ID)]
    : await Promise.all([createAccount("rt-seller"), createAccount("rt-buyer")]);
const { dealId, deal, waitedS } = await playDeal(seller, buyer);

if (deal.state === "Matched") {
  const rupiah = rupiahOf(deal.price);
  const ok = rupiah >= BigInt(sellerLimit) && rupiah <= BigInt(buyerLimit);
  console.log(`state=Matched price in [${sellerLimit},${buyerLimit}] ${ok ? "ok" : "OUT OF RANGE"} (Rp ${rupiah})`);
  if (!ok) process.exitCode = 1;
} else {
  console.log(`state=${deal.state}`);
  if (deal.state === "Computing") process.exitCode = 1;
}
console.log(`waited ${waitedS}s after the buyer's submit`);

if (escrow && deal.state === "Matched") {
  // Released path: the buyer pays, then confirms; the seller's balance rises by exactly the price.
  const before = await seller.getBalance();
  await call(buyer, "deposit", { deal_id: dealId }, BigInt(deal.price));
  await call(buyer, "confirm_received", { deal_id: dealId });
  const released = await getDeal(seller, dealId);
  const gained = (await seller.getBalance()) - before;
  if (released.state === "Released" && gained === BigInt(deal.price)) console.log(`released (seller +${gained} yocto)`);
  else fail(`release FAILED: state=${released.state}, seller gained ${gained} of ${deal.price}`);

  // Refunded path: fund a second deal and let a third party refund it once the deadline has passed.
  const second = await playDeal(seller, buyer);
  if (second.deal.state !== "Matched") fail(`second deal did not match: ${second.deal.state}`);
  else {
    await call(buyer, "deposit", { deal_id: second.dealId }, BigInt(second.deal.price));
    const { deadline_ns } = await getDeal(buyer, second.dealId);
    const waitS = Math.ceil((Number(deadline_ns) / 1e6 - Date.now()) / 1000) + 5;
    if (waitS > MAX_REFUND_WAIT_S) {
      throw new Error(`deadline is ${waitS}s away; redeploy a test contract with DELIVERY_WINDOW_SECS=30`);
    }
    if (waitS > 0) await sleep(waitS * 1000);
    const before = await buyer.getBalance();
    await call(seller, "refund", { deal_id: second.dealId }); // the seller is a third party here
    const refunded = await getDeal(buyer, second.dealId);
    const returned = (await buyer.getBalance()) - before;
    if (refunded.state === "Refunded" && returned === BigInt(second.deal.price)) {
      console.log(`refunded (buyer +${returned} yocto)`);
    } else fail(`refund FAILED: state=${refunded.state}, buyer got ${returned} of ${second.deal.price}`);
  }
}
