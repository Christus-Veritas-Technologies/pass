"use client";

import {
  BankIcon,
  CheckmarkCircle01Icon,
  CrownIcon,
  SparklesIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { cn } from "@/lib/utils";

type Billing = "MONTHLY" | "ANNUAL";

const PLAN_PRICES = {
  FREE:  { MONTHLY: "$0",     ANNUAL: "$0"     },
  STUDY: { MONTHLY: "$2.99",  ANNUAL: "$19.99" },
  PASS:  { MONTHLY: "$5.99",  ANNUAL: "$39.99" },
};

const ANNUAL_EQUIV = {
  STUDY: "$1.67/mo",
  PASS:  "$3.33/mo",
};

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    period: { MONTHLY: "forever", ANNUAL: "forever" },
    tagline: "Start practising today",
    icon: ZapIcon,
    color: "text-muted-foreground",
    badge: null as string | null,
    cta: "Get started",
    ctaVariant: "outline" as const,
    features: [
      "5 past papers per month",
      "2 AI projects per month",
      "Basic marking guidance",
      "Resource downloads",
    ],
    missing: [
      "12+ papers per month",
      "AI answer explanations",
      "Progress tracking",
    ],
  },
  {
    id: "STUDY",
    name: "Study",
    period: { MONTHLY: "per month", ANNUAL: "per year" },
    tagline: "For serious exam prep",
    icon: SparklesIcon,
    color: "text-primary",
    badge: "Most popular",
    cta: "Upgrade to Study",
    ctaVariant: "default" as const,
    features: [
      "12 past papers per month",
      "7 AI projects per month",
      "Detailed answer explanations",
      "All resource downloads",
      "Progress tracking",
      "Email support",
    ],
    missing: [
      "20 papers per month",
      "12 projects per month",
    ],
  },
  {
    id: "PASS",
    name: "Pass",
    period: { MONTHLY: "per month", ANNUAL: "per year" },
    tagline: "Maximum exam coverage",
    icon: CrownIcon,
    color: "text-amber-500",
    badge: "Best value",
    cta: "Upgrade to Pass",
    ctaVariant: "default" as const,
    features: [
      "20 past papers per month",
      "12 AI projects per month",
      "Detailed worked solutions",
      "All resource downloads",
      "Full progress analytics",
      "Priority support",
    ],
    missing: [],
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("MONTHLY");

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Choose a plan that fits your study goals. Upgrade or cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1 gap-1">
          <button
            onClick={() => setBilling("MONTHLY")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              billing === "MONTHLY"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("ANNUAL")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5",
              billing === "ANNUAL"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Save 44%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const price = PLAN_PRICES[plan.id as keyof typeof PLAN_PRICES][billing];
          const period = plan.period[billing];
          const annualEquiv = billing === "ANNUAL" && plan.id !== "FREE"
            ? ANNUAL_EQUIV[plan.id as keyof typeof ANNUAL_EQUIV]
            : null;

          return (
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
                  <span className="text-3xl font-bold">{price}</span>
                  <span className="text-xs text-muted-foreground">/{period}</span>
                </div>
                {annualEquiv && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">{annualEquiv} — billed annually</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
              </CardHeader>

              <CardContent className="px-5 pb-6 space-y-4">
                <Link href={
                  plan.id === "FREE"
                    ? "/dashboard"
                    : `/checkout?plan=${plan.id}&billing=${billing}`
                }>
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
          );
        })}
      </div>

      {/* Accepted payment methods */}
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-4">Accepted payment methods</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-11 w-11 rounded-xl border bg-muted/50 flex items-center justify-center">
              <HugeiconsIcon icon={BankIcon} className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Bank Transfer</span>
          </div>
          {[
            { src: "/payment-methods/ecocash.png", label: "EcoCash" },
            { src: "/payment-methods/onemoney.png", label: "OneMoney" },
            { src: "/payment-methods/omari.png", label: "Omari" },
            { src: "/payment-methods/innbucks.png", label: "InnBucks" },
          ].map(({ src, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="h-11 w-11 rounded-xl border bg-white overflow-hidden flex items-center justify-center p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="h-full w-full object-contain" />
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-base font-semibold text-center">Common questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "Can I try before I buy?",
              a: "Yes — the Free plan gives you 5 papers and 2 projects every month with no credit card required. Study is $2.99/mo and Pass is $5.99/mo.",
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
            {
              q: "What is the annual plan?",
              a: "Paying annually gives you 12 months for the price of roughly 7 (44% off). Your subscription runs for a full year from the payment date.",
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
