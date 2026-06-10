import { createHash, timingSafeEqual } from "node:crypto";
import { Paynow } from "paynow";
import { env } from "@pass/env/server";
export { PLAN_PRICES, PLAN_DESCRIPTIONS } from "@pass/pricing";

export const paynow = new Paynow(
  env.PAYNOW_INTEGRATION_ID || "",
  env.PAYNOW_INTEGRATION_KEY || ""
);

// resultUrl → server-side webhook (stays on the Hono server port)
// returnUrl → browser redirect after payment (must point to the web app)
paynow.resultUrl = env.PAYNOW_RESULT_URL || "http://localhost:3000/api/payments/webhook";
paynow.returnUrl = env.PAYNOW_RETURN_URL || `${env.APP_URL}/payments/success`;

/**
 * Verify the hash on an incoming Paynow status-update (webhook) body.
 *
 * Paynow signs every message by concatenating the string values of all fields
 * (in the order they appear, excluding `hash`), appending the integration key,
 * and taking the uppercase SHA-512 hex digest. We recompute it and compare in
 * constant time. Fails closed: a missing key or missing/invalid hash is rejected
 * so a forged POST can never upgrade an account. The trusted confirmation path
 * remains server-side polling (we call Paynow's pollUrl directly).
 */
export function verifyPaynowHash(body: string): boolean {
  const key = env.PAYNOW_INTEGRATION_KEY;
  if (!key) return false; // cannot verify without the integration key

  const params = new URLSearchParams(body);
  const received = params.get("hash") ?? params.get("Hash");
  if (!received) return false;

  let concat = "";
  for (const [field, value] of params.entries()) {
    if (field.toLowerCase() === "hash") continue;
    concat += value;
  }
  concat += key;

  const computed = createHash("sha512").update(concat, "utf8").digest("hex").toUpperCase();
  const a = Buffer.from(computed);
  const b = Buffer.from(received.toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
