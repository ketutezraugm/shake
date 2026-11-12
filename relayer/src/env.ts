export type Env = {
  port: number;
  supabaseUrl: string;
  supabaseServiceKey: string;
  contractId: string;
  nearRpcUrl: string;
  allowedOrigin: string;
  /** Set together: the parent signs, so it must be the account whose sub-accounts users get. */
  accounts: { parentId: string; privateKey: `ed25519:${string}`; fundNear: string } | null;
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
    accounts: loadAccounts(source),
  };
}

function loadAccounts(source: NodeJS.ProcessEnv): Env["accounts"] {
  const privateKey = source.RELAYER_PRIVATE_KEY;
  if (!privateKey?.startsWith("ed25519:") || privateKey === "ed25519:replace-me") return null;
  const parentId = required(source, "APP_PARENT_ACCOUNT");
  if (source.RELAYER_ACCOUNT_ID !== parentId) throw new Error("RELAYER_ACCOUNT_ID must equal APP_PARENT_ACCOUNT");
  return { parentId, privateKey: privateKey as `ed25519:${string}`, fundNear: source.FUND_AMOUNT ?? "0.1" };
}
