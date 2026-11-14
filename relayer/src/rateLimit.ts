import type { MiddlewareHandler } from "hono";
import { HttpError } from "./errors.js";


/** Fixed window per client IP, in memory: a restart resets it, which is fine for a testnet demo. */
export function rateLimit(limit: number, now: () => number = Date.now, windowMs = 60 * 1000): MiddlewareHandler {
  const buckets = new Map<string, { count: number; windowStart: number }>();

  return async (c, next) => {
    // Not x-forwarded-for: Render keeps whatever the client sent as its first entry. Cloudflare sets cf-connecting-ip itself and rejects a client-sent one.
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const time = now();
    const bucket = buckets.get(ip);
    if (!bucket || time - bucket.windowStart >= windowMs) {
      buckets.set(ip, { count: 1, windowStart: time });
    } else if (++bucket.count > limit) {
      throw new HttpError(429, "too many requests");
    }
    await next();
  };
}
