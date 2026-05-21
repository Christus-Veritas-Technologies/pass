export { PLAN_LIMITS } from "@pass/pricing";
export type { PlanKey } from "@pass/pricing";

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}
