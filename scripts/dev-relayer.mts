// Local stand-in relayer for clicking through the whole flow before Supabase and sign-in (MK-10, MK-20) are live:
// the real relayer app on in-memory fakes, deals read from the app dev server's mock chain, every key accepted.
// DEV ONLY: it trusts the x-account-id header and forgets everything on restart.
// Run: VITE_RELAYER_URL=http://localhost:8787 npm run dev -w app, then in another terminal: npm run dev:relayer
// With the app on the real testnet contract (VITE_CONTRACT_ID set), start this with the same CONTRACT_ID so deals are read from testnet.
// Uses NEAR_AI_API_KEY from relayer/.env when present, so the assistant answers; without it /assistant is a 503.
import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createApp } from "../relayer/src/app";
import { nearAiChat } from "../relayer/src/assistant";
import { FakeStore } from "../relayer/src/fakes";
import { rpcNearReader, type ChainDeal, type NearReader } from "../relayer/src/near";

try {
  process.loadEnvFile("relayer/.env");
} catch {}

const PORT = 8787;
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:5173";
const SELF = `http://localhost:${PORT}`;

const mockChain: NearReader = {
  async getDeal(dealId) {
    const deals = (await (await fetch(`${APP_ORIGIN}/__mock-chain`)).json()) as ChainDeal[];
    return deals.find((deal) => deal.id === dealId) ?? null;
  },
  hasAccessKey: async () => true,
};
const { CONTRACT_ID } = process.env;
const near: NearReader = CONTRACT_ID
  ? { ...rpcNearReader("https://test.rpc.fastnear.com", CONTRACT_ID), hasAccessKey: async () => true }
  : mockChain;

const photos = new Map<string, { type: string; bytes: ArrayBuffer }>();

/** Photos go to this process instead of Supabase storage. */
class DevStore extends FakeStore {
  override async addPhoto(id: string) {
    const photoUrl = `${SELF}/dev-photos/${randomUUID()}`;
    this.listings.find((listing) => listing.id === id)?.photoUrls.push(photoUrl);
    return { uploadUrl: photoUrl, photoUrl };
  }
}

const store = new DevStore();
const key = process.env.NEAR_AI_API_KEY;
const relayer = createApp({ store, near, allowedOrigin: APP_ORIGIN, chat: key ? nearAiChat(key) : undefined });

const app = new Hono();
app.use("/dev-photos/*", cors({ origin: APP_ORIGIN }));
app.put("/dev-photos/:name", async (c) => {
  photos.set(c.req.param("name"), { type: c.req.header("content-type") ?? "image/jpeg", bytes: await c.req.arrayBuffer() });
  return c.body(null, 200);
});
app.get("/dev-photos/:name", (c) => {
  const photo = photos.get(c.req.param("name"));
  return photo ? c.body(photo.bytes, 200, { "content-type": photo.type }) : c.body(null, 404);
});

// The mock sign-in never calls POST /accounts, so give each account a shop the first time it speaks.
app.use("*", async (c, next) => {
  const account = c.req.header("x-account-id");
  if (account && !(await store.profileOf(account))) {
    const handle = account.split(".")[0] ?? account;
    await store.createProfile({ accountId: account, handle, auth: "wallet", supabaseUserId: null }).catch(() => undefined);
    await store.saveProfile(account, { displayName: handle, bio: "", city: "", avatarUrl: null }).catch(() => undefined);
  }
  await next();
});
app.route("/", relayer);

serve({ fetch: app.fetch, port: PORT }, () => console.log(`dev relayer on ${SELF} (assistant ${key ? "on" : "off"}), mock chain at ${APP_ORIGIN}`));
