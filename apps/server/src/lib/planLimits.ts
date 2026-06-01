export { PLAN_LIMITS } from "@pass/pricing";
export type { PlanKey } from "@pass/pricing";

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/** Every ambassador gets 1000 of each quota type per month, regardless of plan. */
export const AMBASSADOR_LIMIT = 1000;
