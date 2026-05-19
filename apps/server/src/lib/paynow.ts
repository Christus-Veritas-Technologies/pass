import { Paynow } from "paynow";

/**
 * Initialize Paynow SDK with integration credentials from env.
 */
export const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID || "",
  process.env.PAYNOW_INTEGRATION_KEY || ""
);

// Set redirect URLs for payment flow
paynow.resultUrl = process.env.PAYNOW_RESULT_URL || "http://localhost:3000/api/payments/webhook";
paynow.returnUrl = process.env.PAYNOW_RETURN_URL || "http://localhost:3000/payments/success";

/**
 * Plan pricing in ZWL (Zimbabwe Dollar equivalent of $2.99 and $5.99 USD).
 * For now, using simple USD equivalent. In production, convert to ZWL dynamically.
 */
export const PLAN_PRICES: Record<string, number> = {
  STUDY: 2.99,
  PASS: 5.99,
};

/**
 * Human-readable plan names for Paynow items.
 */
export const PLAN_DESCRIPTIONS: Record<string, string> = {
  STUDY: "STUDY Plan - 1 month",
  PASS: "PASS Plan - 1 month",
};
