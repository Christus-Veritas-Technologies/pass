/**
 * Lightweight in-memory rate limiter for Hono.
 *
 * Fixed-window per client IP. No external dependency or store — sufficient for a
 * single-instance Bun deployment to blunt brute-force, webhook spam, and quota
 * races. (Behind multiple instances each holds its own window; move to a shared
 * store like Redis if the API is horizontally scaled.)
 */

import type { Context, Next } from "hono";

type Bucket = { count: number; resetAt: number };

function clientIp(c: Context): string {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return c.req.header("x-real-ip") || c.req.header("cf-connecting-ip") || "unknown";
}

export function rateLimit(opts: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key = "g" } = opts;
  const buckets = new Map<string, Bucket>();

  // Periodically evict expired buckets so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }, windowMs);
  // Don't keep the process alive just for the sweep timer (Bun/Node support unref).
  (sweep as { unref?: () => void }).unref?.();

  return async (c: Context, next: Next) => {
    const id = `${key}:${clientIp(c)}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(id, b);
    }
    b.count++;

    if (b.count > max) {
      const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests. Please slow down and try again shortly." }, 429);
    }

    await next();
  };
}
