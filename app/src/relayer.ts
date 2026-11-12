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

async function send<T>(url: string, init: RequestInit, what: string): Promise<T> {
  const response = await fetch(url, init).catch(() => {
    throw new RelayerError(`${what} failed: could not reach the relayer`, 0);
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new RelayerError(`${what} failed: ${error ?? `relayer answered ${response.status}`}`, response.status);
  }
  return (await response.json()) as T;
}

/** GETs from the relayer signed as `signer`; the signature covers the path, not the query string. */
export async function signedGet<T>(relayerUrl: string, signer: Signer, path: string, what: string, query = ""): Promise<T> {
  return send(relayerUrl + path + query, { headers: await signer.signRequest("GET", path, "") }, what);
}

async function signedJson<T>(method: "POST" | "PUT", relayerUrl: string, signer: Signer, path: string, payload: object, what: string): Promise<T> {
  const body = JSON.stringify(payload);
  const headers = { "content-type": "application/json", ...(await signer.signRequest(method, path, body)) };
  return send(relayerUrl + path, { method, headers, body }, what);
}

/** POSTs JSON to the relayer signed as `signer`; failures read as "<what> failed: <reason>". */
export const signedPost = <T>(relayerUrl: string, signer: Signer, path: string, payload: object, what: string) =>
  signedJson<T>("POST", relayerUrl, signer, path, payload, what);

export const signedPut = <T>(relayerUrl: string, signer: Signer, path: string, payload: object, what: string) =>
  signedJson<T>("PUT", relayerUrl, signer, path, payload, what);
