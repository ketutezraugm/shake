// Real testnet check of the marketplace path (MK-07): a listing with slots, a buyer claiming one, OutLayer matching,
// escrow, and the relayer's sync. The chain and OutLayer are live; the relayer runs in-process. By default it uses an
// in-memory store; with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set (read from relayer/.env) it uses the real
// Supabase store and deletes the listings it created when it finishes (MK-07's Supabase half, needs migrations 0001-0003).
// Run: npx tsx scripts/marketplace-roundtrip.mts
// Env (optional): CONTRACT_ID, TEE_PUBKEY, SELLER_ID, BUYER_ID (accounts whose keys are in ~/.near-credentials/testnet,
// since the faucet rate-limits new ones), SELLER_LIMIT and BUYER_LIMIT (Rupiah, default 4000000 and 4600000).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { nearClient } from "../app/src/nearClient";
import { sealLimit } from "../app/src/crypto";
import { keySigner, type Signer } from "../app/src/signer";
import { createSlots } from "../app/src/slots";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "../relayer/src/app";
import { FakeStore } from "../relayer/src/fakes";
import { rpcNearReader } from "../relayer/src/near";
import { supabaseStore } from "../relayer/src/supabaseStore";

const chain = {
  contractId: process.env.CONTRACT_ID ?? "blind-deal-59xtyh4b.testnet",
  rpcUrl: "https://test.rpc.fastnear.com", // the legacy rpc.testnet.near.org rate-limits and is deprecated
};
const TEE_PUBKEY = process.env.TEE_PUBKEY ?? "028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e";
const SELLER_ID = process.env.SELLER_ID ?? "rt-seller-3a6ojo95.testnet";
const BUYER_ID = process.env.BUYER_ID ?? "rt-buyer-bms68l9a.testnet";
const sellerLimit = process.env.SELLER_LIMIT ?? "4000000";
const buyerLimit = process.env.BUYER_LIMIT ?? "4600000";
const RELAYER = "http://relayer.local";
const WAIT_MS = 90_000;

// slots.ts keeps the seller's minimum in localStorage; Node has none.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) },
});

try {
  process.loadEnvFile("relayer/.env");
} catch {}
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const live = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const store = live ? supabaseStore(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) : new FakeStore();
const createdListings: string[] = [];
let retries = 0;
const relayer = createApp({ store, near: rpcNearReader(chain.rpcUrl, chain.contractId), allowedOrigin: "*" });
const realFetch = globalThis.fetch;
// Requests to the relayer's address go to the in-process app; everything else (the RPC node) is real.
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url.startsWith(RELAYER)) return relayer.fetch(new Request(url, init));
  const response = await realFetch(input, init);
  if (process.env.TRACE) await traceReceipts(response);
  return response;
};

type Outcome = { executor_id: string; logs: string[]; status: { Failure?: unknown } };
/** TRACE=1: prints every receipt of a contract call (who ran it, whether it failed, its logs), to see why a round ended in NoDeal. */
async function traceReceipts(response: Response) {
  const result = ((await response.clone().json().catch(() => null)) as { result?: Record<string, any> } | null)?.result; // eslint-disable-line @typescript-eslint/no-explicit-any
  const method = result?.transaction?.actions?.[0]?.FunctionCall?.method_name;
  if (!method) return;
  console.log(`  [tx ${method}]`);
  for (const { outcome } of (result?.receipts_outcome ?? []) as { outcome: Outcome }[]) {
    const failure = outcome.status.Failure ? ` FAILED ${JSON.stringify(outcome.status.Failure).slice(0, 300)}` : "";
    const logs = outcome.logs.length ? ` logs=${JSON.stringify(outcome.logs).slice(0, 400)}` : "";
    if (failure || logs || method === "submit_limit") console.log(`    ${outcome.executor_id}${failure}${logs}`);
  }
}

function signerFor(accountId: string): Signer {
  const { private_key } = JSON.parse(readFileSync(join(homedir(), ".near-credentials", "testnet", `${accountId}.json`), "utf8"));
  return keySigner(accountId, private_key, chain);
}

async function api(signer: Signer | null, method: string, path: string, body?: object) {
  const raw = body ? JSON.stringify(body) : "";
  const headers = signer ? await signer.signRequest(method, path, raw) : {};
  const response = await globalThis.fetch(RELAYER + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: raw || undefined,
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

const seller = signerFor(SELLER_ID);
const buyer = signerFor(BUYER_ID);
const sellerClient = nearClient(seller, chain);
const buyerClient = nearClient(buyer, chain);
const steps: string[] = [];
let failed = false;
const check = (ok: boolean, label: string) => {
  if (!ok) {
    failed = true;
    console.log(`FAILED: ${label}`);
  }
  return ok;
};

/** One listing with `slots` deals; the buyer claims one, offers, and waits for OutLayer. Returns the finished deal. */
async function play(title: string, slots: number, minimum: string, maximum: string) {
  const created = await api(seller, "POST", "/listings", { title, description: "", category: "electronics", maxRounds: 1, askingPrice: maximum });
  const listingId = created.json.id as string;
  createdListings.push(listingId);
  await createSlots({
    listingId,
    count: slots,
    minimum,
    maxRounds: 1,
    signer: seller,
    client: sellerClient,
    teePubkey: TEE_PUBKEY,
    relayerUrl: RELAYER,
    onProgress: (done, total) => console.log(`  slot ${done}/${total} created and registered`),
  });
  const shown = await api(null, "GET", `/listings/${listingId}`);
  check(shown.json.freeSlots === slots, `listing shows ${slots} free slots, got ${shown.json.freeSlots}`);

  const claim = await api(buyer, "POST", `/listings/${listingId}/claim`);
  check(claim.status === 200, `claim answered ${claim.status}`);
  const { dealId, linkToken } = claim.json as { dealId: number; linkToken: string };
  const after = await api(null, "GET", `/listings/${listingId}`);
  check(after.json.freeSlots === slots - 1, `claiming took one slot, free slots now ${after.json.freeSlots}`);

  const sealed = await sealLimit(dealId, "buyer", 1, maximum, TEE_PUBKEY);
  await buyerClient.submitLimit(dealId, sealed.ct, sealed.commit, linkToken);

  const started = Date.now();
  let deal = await buyerClient.getDeal(dealId);
  while (deal?.state === "Computing" && Date.now() - started < WAIT_MS) {
    await new Promise((r) => setTimeout(r, 2000));
    deal = await buyerClient.getDeal(dealId);
  }
  // OutLayer failed to run the matcher: the contract handed the round back, so both sides submit it again.
  while (deal?.state === "Waiting" && deal.round === 1 && deal.buyer_cts.length === 0 && deal.seller_cts.length === 0) {
    retries++;
    console.log(`  matcher failed, round handed back (retry ${deal.matcher_retries} on deal ${dealId}); submitting again`);
    const again = await sealLimit(dealId, "seller", 1, minimum, TEE_PUBKEY);
    await sellerClient.submitLimit(dealId, again.ct, again.commit, null);
    const rebuy = await sealLimit(dealId, "buyer", 1, maximum, TEE_PUBKEY);
    await buyerClient.submitLimit(dealId, rebuy.ct, rebuy.commit, null);
    deal = await buyerClient.getDeal(dealId);
    while (deal?.state === "Computing" && Date.now() - started < WAIT_MS) {
      await new Promise((r) => setTimeout(r, 2000));
      deal = await buyerClient.getDeal(dealId);
    }
  }
  return { listingId, dealId, deal, waitedS: Math.round((Date.now() - started) / 1000) };
}

console.log(`contract ${chain.contractId}, seller ${SELLER_ID}, buyer ${BUYER_ID}, store ${live ? "SUPABASE (live)" : "in-memory"}`);

console.log("A: overlapping limits");
const a = await play("Roundtrip camera", 2, sellerLimit, buyerLimit);
steps.push("listing open", "2 slots registered", "buyer claimed slot");
if (check(a.deal?.state === "Matched", `expected Matched, got ${a.deal?.state}`)) {
  const rupiah = BigInt(a.deal!.price!) / 10n ** 16n; // demo rate: Rp 100M per NEAR
  const inRange = rupiah >= BigInt(sellerLimit) && rupiah <= BigInt(buyerLimit);
  check(inRange, `price Rp ${rupiah} is outside [${sellerLimit}, ${buyerLimit}]`);
  steps.push(`Matched price in [${sellerLimit},${buyerLimit}] (Rp ${rupiah}, ${a.waitedS}s)`);

  await buyerClient.deposit(a.dealId);
  const funded = await buyerClient.getDeal(a.dealId);
  check(funded?.state === "Funded", `after deposit expected Funded, got ${funded?.state}`);
  steps.push("deposit Funded");

  const reserved = await api(null, "POST", `/listings/${a.listingId}/sync`);
  check(reserved.json.status === "reserved" && reserved.json.reservedDealId === a.dealId, `funded deal should reserve the listing, got ${reserved.json.status} / ${reserved.json.reservedDealId}`);
  steps.push(`sync ${reserved.json.status} by deal ${reserved.json.reservedDealId}`);

  await buyerClient.confirmReceived(a.dealId);
  const released = await buyerClient.getDeal(a.dealId);
  check(released?.state === "Released", `after confirm_received expected Released, got ${released?.state}`);
  const sold = await api(null, "POST", `/listings/${a.listingId}/sync`);
  check(sold.json.status === "sold" && sold.json.reservedDealId === null, `released deal should sell the listing, got ${sold.json.status}`);
  steps.push(`Received -> sync ${sold.json.status}`);

  const again = await api(buyer, "POST", `/listings/${a.listingId}/claim`);
  check(again.status === 409, `claim after sold expected 409, got ${again.status}`);
  steps.push(`claim after sold ${again.status}`);
}
console.log(steps.join(" -> "));

console.log("B: limits that do not overlap");
const b = await play("Roundtrip no deal", 1, "5000000", "4000000");
check(b.deal?.state === "NoDeal", `expected NoDeal, got ${b.deal?.state}`);
console.log(`state=${b.deal?.state} (${b.waitedS}s)`);

if (live && createdListings.length > 0) {
  // Slots cascade with their listing; only the rows this run created are removed.
  const db = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { error } = await db.from("listings").delete().in("id", createdListings);
  console.log(error ? `cleanup failed: ${error.message}` : `cleanup: removed ${createdListings.length} test listings`);
}

if (retries > 0) console.log(`matcher retries handled: ${retries}`);
console.log(failed ? "RESULT: FAILED" : "RESULT: ok");
process.exit(failed ? 1 : 0);
