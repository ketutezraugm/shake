import { serve } from "@hono/node-server";
import { nearAiChat } from "./assistant.js";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { rpcNearReader } from "./near.js";
import { supabaseJwtVerifier } from "./supabaseAuth.js";
import { supabaseStore } from "./supabaseStore.js";

const env = loadEnv();
const app = createApp({
  store: supabaseStore(env.supabaseUrl, env.supabaseServiceKey),
  near: rpcNearReader(env.nearRpcUrl, env.contractId),
  allowedOrigin: env.allowedOrigin,
  chat: env.nearAiApiKey ? nearAiChat(env.nearAiApiKey) : undefined,
  verifyJwt: supabaseJwtVerifier(env.supabaseUrl, env.supabaseServiceKey),
});

serve({ fetch: app.fetch, port: env.port }, ({ port }) => console.log(`relayer listening on ${port}`));
