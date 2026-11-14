import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HttpError } from "./errors.js";
import { rateLimit } from "./rateLimit.js";

function appWithLimit(limit: number) {
  const app = new Hono();
  app.use(rateLimit(limit));
  app.onError((err, c) => (err instanceof HttpError ? c.json({ error: err.message }, err.status) : c.json({}, 500)));
  app.get("/", (c) => c.text("ok"));
  return app;
}

const from = (ip: string, forwardedFor?: string) =>
  new Request("http://x/", { headers: { "cf-connecting-ip": ip, ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}) } });

describe("rateLimit", () => {
  it("limits per proxy-reported IP and ignores a client-chosen x-forwarded-for", async () => {
    const app = appWithLimit(2);
    expect((await app.request(from("1.1.1.1", "9.9.9.1"))).status).toBe(200);
    expect((await app.request(from("1.1.1.1", "9.9.9.2"))).status).toBe(200);
    expect((await app.request(from("1.1.1.1", "9.9.9.3"))).status).toBe(429);
    expect((await app.request(from("2.2.2.2"))).status).toBe(200);
  });
});
