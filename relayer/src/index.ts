import { serve } from "@hono/node-server";
import { nearAiChat } from "./assistant.js";
import { nearAccountCreator, nearToYocto } from "./accounts.js";
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
  accounts: env.accounts
    ? {
        creator: nearAccountCreator(env.nearRpcUrl, env.accounts.parentId, env.accounts.privateKey),
        verifyJwt: supabaseJwtVerifier(env.supabaseUrl, env.supabaseServiceKey),
        fundYocto: nearToYocto(env.accounts.fundNear),
      }
    : undefined,
});

serve({ fetch: app.fetch, port: env.port }, ({ port }) => console.log(`relayer listening on ${port}`));
