import type { ChainConfig } from "./signer";

const env = import.meta.env as Record<string, string | undefined>;

/** Undefined until a relayer is deployed; screens that need it say so instead of failing on a bad URL. */
export const relayerUrl = env.VITE_RELAYER_URL;
export const teePubkey = env.VITE_TEE_PUBKEY;

/** Supabase Auth only (Google and email links); the anon key cannot read marketplace data, which RLS locks to the relayer. */
export const supabaseUrl = env.VITE_SUPABASE_URL;
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const chain: ChainConfig = {
  contractId: env.VITE_CONTRACT_ID ?? "",
  rpcUrl: env.VITE_NEAR_RPC_URL ?? "https://test.rpc.fastnear.com",
};

// 3 deals take about 15 s; each further one adds 4-6 s of waiting while the seller watches.
export const SLOTS_AT_PUBLISH = 3;
