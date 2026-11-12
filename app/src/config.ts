import type { AuthConfig } from "./auth";
import type { ChainConfig } from "./signer";

const env = import.meta.env as Record<string, string | undefined>;

/** Undefined until a relayer is deployed; screens that need it say so instead of failing on a bad URL. */
export const relayerUrl = env.VITE_RELAYER_URL;
export const teePubkey = env.VITE_TEE_PUBKEY;

export const chain: ChainConfig = {
  contractId: env.VITE_CONTRACT_ID ?? "",
  rpcUrl: env.VITE_NEAR_RPC_URL ?? "https://test.rpc.fastnear.com",
};

// 3 deals take about 15 s; each further one adds 4-6 s of waiting while the seller watches.
export const SLOTS_AT_PUBLISH = 3;

/** Supabase Auth for Google and email sign-in; undefined runs the app with a stand-in sign-in for local work. */
export const authConfig: AuthConfig | undefined =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY } : undefined;
