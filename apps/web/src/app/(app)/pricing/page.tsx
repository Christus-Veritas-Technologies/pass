import {
  CheckmarkCircle01Icon,
  CrownIcon,
  SparklesIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Start practising today",
    icon: ZapIcon,
    color: "text-muted-foreground",
    badge: null,
    cta: "Get started",
    ctaVariant: "outline" as const,
    features: [
      "3 past papers per month",
      "1 AI project per month",
      "Basic marking guidance",
      "Resource downloads",
      "Community support",
    ],
    missing: [
      "Unlimited papers",
      "Priority AI responses",
      "Detailed answer explanations",
    ],
  },
  {
    id: "STUDY",
    name: "Study",
    price: "$5",
    period: "per month",
    tagline: "For serious exam prep",
    icon: SparklesIcon,
    color: "text-primary",
    badge: "Most popular",
    cta: "Upgrade to Study",
    ctaVariant: "default" as const,
    features: [
      "20 past papers per month",
      "5 AI projects per month",
      "Detailed answer explanations",
      "All resource downloads",
      "Progress tracking",
      "Email support",
    ],
    missing: [
      "Unlimited papers & projects",
      "Priority AI responses",
    ],
  },
  {
    id: "PASS",
    name: "Pass",
    price: "$12",
    period: "per month",
    tagline: "Everything, unlimited",
    icon: CrownIcon,
    color: "text-amber-500",
    badge: "Best value",
    cta: "Upgrade to Pass",
    ctaVariant: "default" as const,
    features: [
      "Unlimited past papers",
      "Unlimited AI projects",
      "Priority AI responses",
      "Detailed worked solutions",
      "All resource downloads",
      "Full progress analytics",
      "Priority support",
    ],
    missing: [],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Choose a plan that fits your study goals. Upgrade or cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "rounded-xl relative transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-md",
              plan.id === "STUDY" && "ring-2 ring-primary shadow-lg",
            )}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="text-xs font-semibold">{plan.badge}</Badge>
              </div>
            )}

            <CardHeader className="pt-6 pb-4 px-5">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl mb-3", plan.id === "PASS" ? "bg-amber-50" : plan.id === "STUDY" ? "bg-primary/10" : "bg-muted")}>
                <HugeiconsIcon icon={plan.icon} className={cn("h-5 w-5", plan.color)} />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{plan.name}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-xs text-muted-foreground">/{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
            </CardHeader>

            <CardContent className="px-5 pb-6 space-y-4">
              <Link href={plan.id === "FREE" ? "/dashboard" : "/dashboard"}>
                <Button variant={plan.ctaVariant} className="w-full">
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground line-through">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-30" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-base font-semibold text-center">Common questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "Can I try before I buy?",
              a: "Yes — the Free plan gives you 3 papers and 1 project every month with no credit card required.",
            },
            {
              q: "Which ZIMSEC subjects are covered?",
              a: "O-Level and A-Level papers for Mathematics, Sciences, English, History, Geography, and more.",
            },
            {
              q: "How does the AI marking work?",
              a: "Our AI tutor reviews your answer against the mark scheme and gives you personalised, encouraging feedback in seconds.",
            },
            {
              q: "Can I cancel at any time?",
              a: "Absolutely. Cancel from your profile settings and you keep access until the end of the billing period.",
            },
          ].map(({ q, a }) => (
            <Card key={q} className="rounded-xl">
              <CardContent className="py-4">
                <p className="text-sm font-medium mb-1">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
