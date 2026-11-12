import type { AssistantRes, Question } from "../../relayer/src/types";
import { RelayerError, signedPost } from "./relayer";
import type { Signer } from "./signer";

export type AssistantReply = AssistantRes;

// Rate limited (429) or no model key (503): the buyer can still put the question to the seller.
const FALL_BACK_TO_SELLER = new Set([429, 503]);

/** `POST /assistant`: an answer from the listing and its public Q&A, or `unknown` when they don't cover it or it is unavailable. */
export async function askAssistant(relayerUrl: string, signer: Signer, listingId: string, question: string): Promise<AssistantReply> {
  try {
    return await signedPost<AssistantRes>(relayerUrl, signer, "/assistant", { listingId, question }, "Asking the assistant");
  } catch (error) {
    if (error instanceof RelayerError && FALL_BACK_TO_SELLER.has(error.status)) return { unknown: true };
    throw error;
  }
}

/** Puts a question to the seller; their answer later shows on the listing for everyone. */
export function askSeller(relayerUrl: string, signer: Signer, listingId: string, question: string): Promise<Question> {
  const text = question.trim();
  if (!text) return Promise.reject(new Error("Type a question first"));
  return signedPost(relayerUrl, signer, `/listings/${listingId}/questions`, { question: text }, "Asking the seller");
}
