export type PlanKey = "FREE" | "STUDY" | "PASS";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type PayablePlanKey = "STUDY" | "PASS";

export const PLANS = {
  FREE: {
    key: "FREE" as const,
    name: "Free",
    tagline: "Start practising today",
    badge: null as string | null,
    prices: { MONTHLY: 0, ANNUAL: 0 },
    annualMonthlyEquiv: null as string | null,
    period: { MONTHLY: "forever", ANNUAL: "forever" },
    limits: { papers: 5, projects: 2 },
    features: [
      "5 past papers per month",
      "2 AI projects per month",
      "Basic marking guidance",
      "Resource downloads",
    ] as string[],
    missing: [
      "12+ papers per month",
      "AI answer explanations",
      "Progress tracking",
    ] as string[],
    highlights: [
      "5 past papers / month",
      "2 AI projects / month",
      "Basic marking",
    ] as string[],
    description: "Get started at no cost",
    payable: false as const,
  },
  STUDY: {
    key: "STUDY" as const,
    name: "Study",
    tagline: "For serious exam prep",
    badge: "Most popular" as string | null,
    // Monthly: $4.99 · Annual: $33.99 (~43% off vs $4.99×12=$59.88)
    prices: { MONTHLY: 4.99, ANNUAL: 33.99 },
    annualMonthlyEquiv: "$2.83/mo" as string | null,
    period: { MONTHLY: "per month", ANNUAL: "per year" },
    limits: { papers: 12, projects: 7 },
    features: [
      "12 past papers per month",
      "7 AI projects per month",
      "Detailed answer explanations",
      "All resource downloads",
      "Progress tracking",
      "Email support",
    ] as string[],
    missing: [
      "20 papers per month",
      "12 projects per month",
    ] as string[],
    highlights: [
      "12 papers / month",
      "Detailed AI explanations",
      "Progress tracking",
    ] as string[],
    description: "Perfect for focused exam preparation",
    payable: true as const,
  },
  PASS: {
    key: "PASS" as const,
    name: "Pass",
    tagline: "Maximum exam coverage",
    badge: "Best value" as string | null,
    // Monthly: $7.99 · Annual: $53.99 (~44% off vs $7.99×12=$95.88)
    prices: { MONTHLY: 7.99, ANNUAL: 53.99 },
    annualMonthlyEquiv: "$4.50/mo" as string | null,
    period: { MONTHLY: "per month", ANNUAL: "per year" },
    limits: { papers: 20, projects: 12 },
    features: [
      "20 past papers per month",
      "12 AI projects per month",
      "Detailed worked solutions",
      "All resource downloads",
      "Full progress analytics",
      "Priority support",
    ] as string[],
    missing: [] as string[],
    highlights: [
      "20 papers / month",
      "Full worked solutions",
      "Priority support",
    ] as string[],
    description: "Maximum exam coverage and support",
    payable: true as const,
  },
};

export const ANNUAL_SAVINGS_PCT = 43;

// Flat price table for server-side payment processing
export const PLAN_PRICES: Record<PayablePlanKey, Record<BillingCycle, number>> = {
  STUDY: { MONTHLY: PLANS.STUDY.prices.MONTHLY, ANNUAL: PLANS.STUDY.prices.ANNUAL },
  PASS:  { MONTHLY: PLANS.PASS.prices.MONTHLY,  ANNUAL: PLANS.PASS.prices.ANNUAL  },
};

// Quota limits used by the server to gate paper/project/AI-message/download usage
export const PLAN_LIMITS: Record<PlanKey, { papers: number; projects: number; aiMessages: number; downloads: number }> = {
  FREE:  { ...PLANS.FREE.limits,  aiMessages: 100,      downloads: 10       },
  STUDY: { ...PLANS.STUDY.limits, aiMessages: 500,      downloads: 50       },
  PASS:  { ...PLANS.PASS.limits,  aiMessages: Infinity, downloads: Infinity },
};

// Human-readable Paynow transaction descriptions
export const PLAN_DESCRIPTIONS: Record<PayablePlanKey, Record<BillingCycle, string>> = {
  STUDY: { MONTHLY: "Study Plan – 1 month", ANNUAL: "Study Plan – 1 year" },
  PASS:  { MONTHLY: "Pass Plan – 1 month",  ANNUAL: "Pass Plan – 1 year"  },
};

// Comparison table rows for the marketing pricing page
export const COMPARISON_ROWS: Array<{
  label: string;
  free: string;
  study: string;
  pass: string;
}> = [
  { label: "Past papers / month",  free: "5",         study: "12",       pass: "20" },
  { label: "AI projects / month",  free: "2",         study: "7",        pass: "12" },
  { label: "AI answer marking",    free: "Basic",     study: "Detailed", pass: "Full worked solutions" },
  { label: "Resource downloads",   free: "Included",  study: "Included", pass: "Included" },
  { label: "Progress tracking",    free: "—",         study: "Included", pass: "Full analytics" },
  { label: "Support",              free: "Community", study: "Email",    pass: "Priority" },
];
