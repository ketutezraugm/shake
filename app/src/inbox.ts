import type { Inbox, Message, Question } from "../../relayer/src/types";
import type { ContractClient } from "./contract";
import { signedGet, signedPost } from "./relayer";
import type { Signer } from "./signer";
import { resubmitSeller, storedMinimum } from "./slots";

const afterQuery = (after?: number) => (after === undefined ? "" : `?after=${after}`);

/** Everything waiting on the signed-in person; `after` is the last message id already seen. */
export function getInbox(relayerUrl: string, signer: Signer, after?: number): Promise<Inbox> {
  return signedGet(relayerUrl, signer, "/me/inbox", "Reading your inbox", afterQuery(after));
}

/** A deal's chat after the last message id seen; the relayer refuses it before a match. */
export function getMessages(relayerUrl: string, signer: Signer, dealId: number, after?: number): Promise<Message[]> {
  return signedGet(relayerUrl, signer, `/deals/${dealId}/messages`, "Reading messages", afterQuery(after));
}

export function sendMessage(relayerUrl: string, signer: Signer, dealId: number, text: string): Promise<Message> {
  const body = text.trim();
  if (!body) return Promise.reject(new Error("Type a message first"));
  return signedPost(relayerUrl, signer, `/deals/${dealId}/messages`, { body }, "Sending the message");
}

/** The seller's public answer to a question; it then shows on the listing for everyone. */
export function answerQuestion(relayerUrl: string, signer: Signer, questionId: number, text: string): Promise<Question> {
  const answer = text.trim();
  if (!answer) return Promise.reject(new Error("Type an answer first"));
  return signedPost(relayerUrl, signer, `/questions/${questionId}/answer`, { answer }, "Sending the answer");
}

/** The number on the Inbox tab: things waiting on the person. Matches are listed but are not "new". */
export const badgeCount = (inbox: Inbox): number => inbox.questions.length + inbox.roundsWaiting.length + inbox.newMessages.length;

export type InboxSide = "buying" | "selling";

/**
 * One account does both jobs, so the relayer sends everything together. The shop's inbox shows the selling side
 * (questions, rounds, chats where the person sells); /inbox shows the buying side.
 */
export function splitInbox(inbox: Inbox, side: InboxSide): Inbox {
  const selling = side === "selling";
  const matches = inbox.matches.filter((m) => (m.role === "seller") === selling);
  const deals = new Set(matches.map((m) => m.dealId));
  return {
    questions: selling ? inbox.questions : [],
    roundsWaiting: selling ? inbox.roundsWaiting : [],
    matches,
    newMessages: inbox.newMessages.filter((m) => deals.has(m.dealId)),
  };
}

export type ResubmitRoundOptions = {
  listingId: string;
  dealId: number;
  round: number;
  /** Omit to keep the stored minimum ("Open round 2"); a lower number is "Lower price". */
  limit?: string;
  client: ContractClient;
  teePubkey: string;
};

/** Answers "Round N requested" with a fresh seal of the same or a lower minimum. */
export async function resubmitRound({ limit, ...rest }: ResubmitRoundOptions): Promise<void> {
  const minimum = limit ?? storedMinimum(rest.listingId);
  if (minimum === null) throw new Error("Round 2 can't be opened here: open this on the device you listed from.");
  await resubmitSeller({ ...rest, limit: minimum });
}
