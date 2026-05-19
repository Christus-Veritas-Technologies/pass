export const PLAN_LIMITS = {
  FREE:  { papers: 5,  projects: 2  },
  STUDY: { papers: 12, projects: 7  },
  PASS:  { papers: 20, projects: 12 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}
