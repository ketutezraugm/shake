export type Env = {
  port: number;
  supabaseUrl: string;
  supabaseServiceKey: string;
  contractId: string;
  nearRpcUrl: string;
  allowedOrigin: string;
};

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name];
  if (!value) throw new Error(`missing env var ${name}`);
  return value;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return {
    port: Number(source.PORT ?? 8787),
    supabaseUrl: required(source, "SUPABASE_URL"),
    supabaseServiceKey: required(source, "SUPABASE_SERVICE_ROLE_KEY"),
    contractId: required(source, "CONTRACT_ID"),
    nearRpcUrl: required(source, "NEAR_RPC_URL"),
    allowedOrigin: required(source, "ALLOWED_ORIGIN"),
  };
}
