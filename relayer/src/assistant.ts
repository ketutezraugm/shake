import { HttpError } from "./errors.js";
import { systemPrompt, UNKNOWN } from "./assistantPrompt.js";
import type { AssistantRes, Listing, Question } from "./types.js";

const NEAR_AI_URL = "https://cloud-api.near.ai/v1/chat/completions";
const MODEL = "deepseek/deepseek-v4.1-flash";

export type ChatMessage = { role: "system" | "user"; content: string };
/** One chat completion: messages in, the model's reply out. */
export type Chat = (messages: ChatMessage[]) => Promise<string>;

export function nearAiChat(apiKey: string, fetchFn: typeof fetch = fetch): Chat {
  return async (messages) => {
    const response = await fetchFn(NEAR_AI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0, max_tokens: 200 }),
    });
    // The prompt and the provider's error body stay out of logs and responses.
    if (!response.ok) throw new HttpError(502, "assistant unavailable");
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  };
}

export async function answerQuestion(chat: Chat, listing: Listing, answered: Question[], question: string): Promise<AssistantRes> {
  const reply = (
    await chat([
      { role: "system", content: systemPrompt(listing, answered) },
      { role: "user", content: question },
    ])
  ).trim();
  return reply === "" || reply.toUpperCase().startsWith(UNKNOWN) ? { unknown: true } : { answer: reply };
}

/** Fixed window per key, in memory: a restart resets it, which is fine for a testnet demo. */
export function quota(limit: number, windowMs: number, now: () => number = Date.now) {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  return (key: string): boolean => {
    const time = now();
    const bucket = buckets.get(key);
    if (!bucket || time - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: time });
      return true;
    }
    return ++bucket.count <= limit;
  };
}
