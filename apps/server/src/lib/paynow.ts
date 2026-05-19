import { Paynow } from "paynow";
import { env } from "@pass/env/server";

export const paynow = new Paynow(
  env.PAYNOW_INTEGRATION_ID || "",
  env.PAYNOW_INTEGRATION_KEY || ""
);

// resultUrl → server-side webhook (stays on the Hono server port)
// returnUrl → browser redirect after payment (must point to the web app)
paynow.resultUrl = env.PAYNOW_RESULT_URL || "http://localhost:3000/api/payments/webhook";
paynow.returnUrl = env.PAYNOW_RETURN_URL || `${env.APP_URL}/payments/success`;

export const PLAN_PRICES: Record<string, Record<string, number>> = {
  STUDY: { MONTHLY: 2.99,  ANNUAL: 19.99 },
  PASS:  { MONTHLY: 5.99,  ANNUAL: 39.99 },
};

export const PLAN_DESCRIPTIONS: Record<string, Record<string, string>> = {
  STUDY: { MONTHLY: "Study Plan – 1 month", ANNUAL: "Study Plan – 1 year" },
  PASS:  { MONTHLY: "Pass Plan – 1 month",  ANNUAL: "Pass Plan – 1 year"  },
};
