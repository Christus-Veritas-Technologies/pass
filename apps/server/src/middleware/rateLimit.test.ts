import { test, expect, describe, setSystemTime } from "bun:test";
import { rateLimit } from "./rateLimit";

/** Minimal stand-in for Hono's Context covering only what rateLimit touches. */
function fakeCtx(ip = "1.2.3.4") {
  const headers: Record<string, string> = {};
  return {
    _headers: headers,
    req: { header: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : undefined) },
    header: (k: string, v: string) => { headers[k] = v; },
    json: (body: unknown, status?: number) => ({ body, status: status ?? 200 }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("rateLimit", () => {
  test("allows up to max, then returns 429 with Retry-After", async () => {
    const mw = rateLimit({ windowMs: 60_000, max: 3, key: "t1" });
    let passed = 0;
    const next = async () => { passed++; };
    const ctx = fakeCtx();

    for (let i = 0; i < 3; i++) {
      expect(await mw(ctx, next)).toBeUndefined(); // passes through
    }
    const blocked = await mw(ctx, next);
    expect(blocked.status).toBe(429);
    expect(ctx._headers["Retry-After"]).toBeDefined();
    expect(passed).toBe(3); // next() not called once blocked
  });

  test("keeps separate buckets per client IP", async () => {
    const mw = rateLimit({ windowMs: 60_000, max: 1, key: "t2" });
    const next = async () => {};
    expect(await mw(fakeCtx("a"), next)).toBeUndefined();
    expect((await mw(fakeCtx("a"), next)).status).toBe(429);
    expect(await mw(fakeCtx("b"), next)).toBeUndefined(); // different IP unaffected
  });

  test("resets after the window elapses", async () => {
    setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const mw = rateLimit({ windowMs: 1_000, max: 1, key: "t3" });
    const next = async () => {};
    const ctx = fakeCtx("z");

    expect(await mw(ctx, next)).toBeUndefined();
    expect((await mw(ctx, next)).status).toBe(429);

    setSystemTime(new Date("2026-01-01T00:00:02Z")); // +2s, past the window
    expect(await mw(ctx, next)).toBeUndefined();

    setSystemTime(); // restore real clock
  });
});
