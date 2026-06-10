export { PLAN_LIMITS } from "@pass/pricing";
export type { PlanKey } from "@pass/pricing";

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * ISO timestamp when the monthly quota next resets (first day of next month,
 * UTC). Returned in quota-exceeded responses so clients can tell the user
 * exactly when their allowance comes back instead of a bare "limit reached".
 */
export function nextMonthlyResetISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

/** Every ambassador gets 1000 of each quota type per month, regardless of plan. */
export const AMBASSADOR_LIMIT = 1000;
