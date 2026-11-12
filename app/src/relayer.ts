import type { Signer } from "./signer";

/** A refusal from the relayer, with its HTTP status so callers can treat some (429, 503) as "try something else". */
export class RelayerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** GETs from the relayer signed as `signer`; the signature covers the path, not the query string. */
export async function signedGet<T>(relayerUrl: string, signer: Signer, path: string, what: string, query = ""): Promise<T> {
  const response = await fetch(relayerUrl + path + query, { headers: await signer.signRequest("GET", path, "") }).catch(() => {
    throw new RelayerError(`${what} failed: could not reach the relayer`, 0);
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new RelayerError(`${what} failed: ${error ?? `relayer answered ${response.status}`}`, response.status);
  }
  return (await response.json()) as T;
}

/** POSTs JSON to the relayer signed as `signer`; failures read as "<what> failed: <reason>". */
export async function signedPost<T>(relayerUrl: string, signer: Signer, path: string, payload: object, what: string): Promise<T> {
  const body = JSON.stringify(payload);
  const response = await fetch(relayerUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(await signer.signRequest("POST", path, body)) },
    body,
  }).catch(() => {
    throw new Error(`${what} failed: could not reach the relayer`);
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new RelayerError(`${what} failed: ${error ?? `relayer answered ${response.status}`}`, response.status);
  }
  return (await response.json()) as T;
}
