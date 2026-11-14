// MK-14: creates the demo shop @demo on a live relayer: the profile, the 6 listings from seed/ with their photos, and
// 3 offer slots each on the real testnet contract. Everything stays open for a judge to bid on.
// Run: npm run demo:seed   (RELAYER_URL defaults to the hosted relayer; DEMO_SELLER_ID is an account whose key is in
// ~/.near-credentials/testnet; CONTRACT_ID and TEE_PUBKEY default to the demo contract and its TEE key.)
// The sealed minimums (80% of the asking price) live only in this process's memory: if a matcher hand-back or a second
// round needs the seller to resubmit, do it from a browser signed in as DEMO_SELLER_ID.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { nearClient } from "../app/src/nearClient";
import { publishListing } from "../app/src/publish";
import { keySigner } from "../app/src/signer";
import type { Category } from "../relayer/src/types";

const RELAYER_URL = process.env.RELAYER_URL ?? "https://shake-relayer.onrender.com";
const SELLER_ID = process.env.DEMO_SELLER_ID ?? "rt-seller-6e6qf7tp.testnet";
const chain = { contractId: process.env.CONTRACT_ID ?? "blind-deal-1wxklib7.testnet", rpcUrl: "https://test.rpc.fastnear.com" };
const TEE_PUBKEY = process.env.TEE_PUBKEY ?? "028be3f388b0896de4519769438841d1d4eef8dc3095c06bcb3dece008de08d92e";
const SLOTS = 3;

// slots.ts keeps the seller's minimum in localStorage; Node has none.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) },
});

type Seed = { photo: string; title: string; description: string; category: Category; askingPrice: string; maxRounds: number };
const seeds = JSON.parse(readFileSync("seed/listings.json", "utf8")) as Seed[];

const { private_key } = JSON.parse(readFileSync(join(homedir(), ".near-credentials", "testnet", `${SELLER_ID}.json`), "utf8"));
const signer = keySigner(SELLER_ID, private_key, chain);
const client = nearClient(signer, chain);

if ((await fetch(`${RELAYER_URL}/profiles/demo`)).status !== 404) throw new Error("@demo already exists; delete its listings and profile first so the shop is not doubled");

const body = JSON.stringify({ handle: "demo", displayName: "Shake demo shop", bio: "Second-hand finds from Yogyakarta. Make a blind offer: my lowest price stays sealed.", city: "Yogyakarta", avatarUrl: null });
const profile = await fetch(`${RELAYER_URL}/me/profile`, { method: "PUT", headers: { "content-type": "application/json", ...(await signer.signRequest("PUT", "/me/profile", body)) }, body });
if (!profile.ok) throw new Error(`profile: ${profile.status} ${await profile.text()}`);

for (const seed of seeds) {
  const minimum = String((BigInt(seed.askingPrice) * 80n) / 100n / 10000n * 10000n);
  await publishListing({
    ...seed,
    minimum,
    photos: [new Blob([readFileSync(join("seed/photos", seed.photo))], { type: "image/jpeg" })],
    slotCount: SLOTS,
    signer,
    client,
    teePubkey: TEE_PUBKEY,
    relayerUrl: RELAYER_URL,
  });
  console.log(`listed: ${seed.title} (asking Rp ${seed.askingPrice}, sealed minimum Rp ${minimum})`);
}
console.log(`\nDemo shop: ${RELAYER_URL.replace("relayer", "app")}/@demo`);
