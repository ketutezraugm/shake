// MK-14, second half: plays one real deal on a demo shop listing on testnet through a live relayer, so the shop shows
// a finished sale with receipts and a short chat. A buyer test account claims a slot, offers inside the overlap, the
// OutLayer matcher prices it, the buyer pays into escrow, both sides chat, and the buyer taps Received.
// Run: npx tsx scripts/demo-play.mts   (RELAYER_URL, DEMO_SELLER_ID, DEMO_BUYER_ID, CONTRACT_ID and TEE_PUBKEY default
// to the hosted relayer, the accounts demo-seed.mts used and the demo contract.)
// Uses the seller's sealed minimum from demo-seed.mts (80% of the asking price, in steps of Rp 10.000) to answer a matcher hand-back.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { nearClient } from "../app/src/nearClient";
import { sealLimit } from "../app/src/crypto";
import { keySigner, type Signer } from "../app/src/signer";

const RELAYER_URL = process.env.RELAYER_URL ?? "https://shake-relayer.onrender.com";
const SELLER_ID = process.env.DEMO_SELLER_ID ?? "rt-seller-6e6qf7tp.testnet";
const BUYER_ID = process.env.DEMO_BUYER_ID ?? "rt-buyer-bms68l9a.testnet";
const chain = { contractId: process.env.CONTRACT_ID ?? "blind-deal-1wxklib7.testnet", rpcUrl: "https://test.rpc.fastnear.com" };
const TEE_PUBKEY = process.env.TEE_PUBKEY ?? "028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e";
// The listing to play, the buyer's offer and the seller's sealed minimum (80% of the asking price, as demo-seed.mts made it).
// The defaults are the Fender speaker: asking Rp 1.600.000, minimum Rp 1.280.000, so an offer of Rp 1.500.000 matches.
const TITLE_START = process.env.TITLE_START ?? "Fender Indio";
const OFFER = process.env.OFFER ?? "1500000";
const SELLER_MINIMUM = process.env.SELLER_MINIMUM ?? "1280000";
const WAIT_MS = 90_000;

const signerFor = (id: string): Signer => {
  const { private_key } = JSON.parse(readFileSync(join(homedir(), ".near-credentials", "testnet", `${id}.json`), "utf8"));
  return keySigner(id, private_key, chain);
};
const seller = signerFor(SELLER_ID);
const buyer = signerFor(BUYER_ID);
const sellerClient = nearClient(seller, chain);
const buyerClient = nearClient(buyer, chain);

async function api(signer: Signer | null, method: string, path: string, body?: object) {
  const raw = body ? JSON.stringify(body) : "";
  const headers = signer ? await signer.signRequest(method, path, raw) : {};
  const response = await fetch(RELAYER_URL + path, { method, headers: { "content-type": "application/json", ...headers }, body: raw || undefined });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(json)}`);
  return json;
}

async function settle(dealId: number) {
  const started = Date.now();
  let deal = await buyerClient.getDeal(dealId);
  while (deal?.state === "Computing" && Date.now() - started < WAIT_MS) {
    await new Promise((r) => setTimeout(r, 2000));
    deal = await buyerClient.getDeal(dealId);
  }
  return deal;
}

const shop = (await api(null, "GET", "/profiles/demo")) as { listings: { id: string; title: string; status: string; freeSlots: number }[] };
const listing = shop.listings.find((l) => l.title.startsWith(TITLE_START));
if (!listing) throw new Error(`"${TITLE_START}" is not in the @demo shop (already sold?)`);
if (listing.status !== "open" || listing.freeSlots < 1) throw new Error(`"${listing.title}" is ${listing.status} with ${listing.freeSlots} free slots; nothing to play`);

// DEAL_ID resumes a deal an earlier run left half way, instead of claiming another slot.
let dealId = Number(process.env.DEAL_ID ?? 0);
if (!dealId) {
  const claim = await api(buyer, "POST", `/listings/${listing.id}/claim`);
  const { linkToken } = claim as { linkToken: string };
  dealId = (claim as { dealId: number }).dealId;
  const sealed = await sealLimit(dealId, "buyer", 1, OFFER, TEE_PUBKEY);
  await buyerClient.submitLimit(dealId, sealed.ct, sealed.commit, linkToken);
}
console.log(`deal ${dealId}: waiting for OutLayer`);

let deal = await settle(dealId);
// OutLayer sometimes fails to run the matcher: the contract hands the round back, and after its retries it moves on to
// the next round. Either way both sides submit again; the buyer raises a little in a later round.
for (let attempt = 0; attempt < 3; attempt++) {
  const handedBack = deal?.state === "Waiting" && deal.buyer_cts.length === 0 && deal.seller_cts.length === 0;
  if (!deal || !(handedBack || deal.state === "Retry")) break;
  const round = deal.round;
  const offer = round === 1 ? OFFER : String(Number(OFFER) + 20_000 * (round - 1));
  console.log(`state ${deal.state}, round ${round}: both sides submit again (buyer offers Rp ${offer})`);
  const again = await sealLimit(dealId, "seller", round, SELLER_MINIMUM, TEE_PUBKEY);
  await sellerClient.submitLimit(dealId, again.ct, again.commit, null);
  const rebuy = await sealLimit(dealId, "buyer", round, offer, TEE_PUBKEY);
  await buyerClient.submitLimit(dealId, rebuy.ct, rebuy.commit, null);
  deal = await settle(dealId);
}
if (deal?.state !== "Matched") throw new Error(`expected Matched, got ${deal?.state}; deal ${dealId} is left as it is`);
console.log(`matched at Rp ${BigInt(deal.price!) / 10n ** 16n}`);

const depositTx = await buyerClient.deposit(dealId);
if (depositTx) await api(buyer, "POST", `/deals/${dealId}/receipts`, { kind: "deposit", txHash: depositTx });
await api(null, "POST", `/listings/${listing.id}/sync`);

await api(buyer, "POST", `/deals/${dealId}/messages`, { body: "Hi! I can pick it up on Saturday afternoon near Malioboro. Does that work?" });
await api(seller, "POST", `/deals/${dealId}/messages`, { body: "Saturday works. See you at 3 pm, I'll bring it with the charger." });
await api(buyer, "POST", `/deals/${dealId}/messages`, { body: "Perfect, thanks!" });

const releaseTx = await buyerClient.confirmReceived(dealId);
if (releaseTx) await api(buyer, "POST", `/deals/${dealId}/receipts`, { kind: "release", txHash: releaseTx });
const sold = await api(null, "POST", `/listings/${listing.id}/sync`);
console.log(`listing is now ${sold.status}`);
