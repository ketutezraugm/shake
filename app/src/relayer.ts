import type { Signer } from "./signer";

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
    throw new Error(`${what} failed: ${error ?? `relayer answered ${response.status}`}`);
  }
  return (await response.json()) as T;
}
