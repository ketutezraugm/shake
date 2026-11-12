import type { NearConnector } from "@hot-labs/near-connect";

let connector: Promise<NearConnector> | undefined;

/** One connector per page, loaded on first use so the wallet code stays out of screens that never sign in. */
export function nearConnector(): Promise<NearConnector> {
  connector ??= import("@hot-labs/near-connect").then(({ NearConnector: Connector }) => new Connector({ network: "testnet" }));
  return connector;
}

export async function getWallet() {
  return (await nearConnector()).wallet();
}

export async function disconnectWallet(): Promise<void> {
  if (connector) await (await connector).disconnect().catch(() => undefined);
}
