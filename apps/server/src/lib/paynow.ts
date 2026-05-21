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
