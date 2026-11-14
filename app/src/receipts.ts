import type { HistoryItem, PostReceiptReq, Receipt } from "../../relayer/src/types";
import { signedGet, signedPost } from "./relayer";
import type { Signer } from "./signer";

/** Tells the relayer which transaction moved the money; it checks the chain and keeps the proof for both sides. */
export function postReceipt(relayerUrl: string, signer: Signer, dealId: number, receipt: PostReceiptReq): Promise<Receipt> {
  return signedPost(relayerUrl, signer, `/deals/${dealId}/receipts`, receipt, "Saving the receipt");
}

/** Every deal the signed-in person bought or sold, with its receipts. */
export function getHistory(relayerUrl: string, signer: Signer): Promise<HistoryItem[]> {
  return signedGet(relayerUrl, signer, "/me/history", "Reading your history");
}
