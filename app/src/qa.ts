import type { Question } from "../../relayer/src/types";
import { signedPost } from "./relayer";
import type { Signer } from "./signer";

/** `POST /assistant`: an answer from the listing and its public Q&A, or `unknown` when they don't cover it (MK-05). */
export type AssistantReply = { answer: string } | { unknown: true };

export function askAssistant(relayerUrl: string, signer: Signer, listingId: string, question: string): Promise<AssistantReply> {
  return signedPost(relayerUrl, signer, "/assistant", { listingId, question }, "Asking the assistant");
}

/** Puts a question to the seller; their answer later shows on the listing for everyone. */
export function askSeller(relayerUrl: string, signer: Signer, listingId: string, question: string): Promise<Question> {
  const text = question.trim();
  if (!text) return Promise.reject(new Error("Type a question first"));
  return signedPost(relayerUrl, signer, `/listings/${listingId}/questions`, { question: text }, "Asking the seller");
}
