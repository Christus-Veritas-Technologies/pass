/**
 * Retry helper for Mastra / Anthropic API calls.
 *
 * The Claude API occasionally returns 529 overloaded or 429 rate-limit errors.
 * One automatic retry after a short delay recovers most transient cases without
 * any user-facing error, so the "I'm having trouble thinking" message fires far
 * less often.
 */

const TRANSIENT_RE = /overload|rate.?limit|too.many.request|timeout|socket|network|ECONNRESET|ENOTFOUND|529|529/i;

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number }).status;
  return TRANSIENT_RE.test(msg) || status === 529 || status === 429 || status === 503;
}

/**
 * Run `fn` and retry once after `delayMs` when the error looks transient.
 * Throws on the second failure or on any non-transient error.
 */
export async function withRetry<T>(fn: () => Promise<T>, delayMs = 2500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return fn(); // let the second attempt throw naturally
  }
}
