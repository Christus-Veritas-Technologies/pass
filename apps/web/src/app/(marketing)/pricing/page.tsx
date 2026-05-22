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
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { cn } from "@/lib/utils";
import { isLoggedIn } from "@/lib/auth";
import {
  PLANS as PLAN_DATA,
  COMPARISON_ROWS,
  ANNUAL_SAVINGS_PCT,
  type BillingCycle,
} from "@pass/pricing";

type Billing = BillingCycle;

const PLAN_META = {
  FREE:  { icon: ZapIcon,      color: "text-muted-foreground", iconBg: "bg-muted"      },
  STUDY: { icon: SparklesIcon, color: "text-primary",          iconBg: "bg-primary/10" },
  PASS:  { icon: CrownIcon,    color: "text-amber-500",        iconBg: "bg-amber-50"   },
} as const;

const PLANS = (["FREE", "STUDY", "PASS"] as const).map((id) => ({
  id,
  ...PLAN_DATA[id],
  ...PLAN_META[id],
}));

const FAQS = [
  {
    q: "Can I try before I buy?",
    a: `Yes — the Free plan gives you 5 papers and 2 projects every month with no credit card required. Study is $${PLAN_DATA.STUDY.prices.MONTHLY}/mo and Pass is $${PLAN_DATA.PASS.prices.MONTHLY}/mo.`,
  },
  {
    q: "Which ZIMSEC subjects are covered?",
    a: "O-Level and A-Level papers for Mathematics, Sciences, English, History, Geography, and more — 55+ subjects in total.",
  },
  {
    q: "How does the AI marking work?",
    a: "Our AI tutor reviews your answer against the official ZIMSEC mark scheme and gives you personalised, encouraging feedback in seconds.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Absolutely. Cancel from your profile settings and you keep access until the end of the billing period.",
  },
  {
    q: "What is the annual plan?",
    a: `Paying annually gives you 12 months for the price of roughly 7 (${ANNUAL_SAVINGS_PCT}% off). Your subscription runs for a full year from the payment date.`,
  },
];

export default function MarketingPricing() {
  const [billing, setBilling] = useState<Billing>("MONTHLY");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  return (
    <div className="bg-background">
      {/* Hero band */}
      <section className="px-6 pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] leading-tight md:text-6xl">
            Pay for what you need.
            <br />
            <span className="font-marketing-serif italic font-normal">Not a penny more.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Free forever. Or unlock the full library from ${PLAN_DATA.STUDY.prices.MONTHLY}/month. Prices in USD, billed in your choice of ZWL or USD.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-xl border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setBilling("MONTHLY")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                billing === "MONTHLY"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("ANNUAL")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                billing === "ANNUAL"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annual
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                Save {ANNUAL_SAVINGS_PCT}%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const price = plan.prices[billing] === 0 ? "$0" : `$${plan.prices[billing].toFixed(2)}`;
            const period = plan.period[billing];
            const annualEquiv = billing === "ANNUAL" ? plan.annualMonthlyEquiv : null;

            const ctaLabel = plan.id === "FREE"
              ? loggedIn ? "You're on Free" : "Start free"
              : loggedIn ? `Upgrade to ${plan.name}` : `Choose ${plan.name}`;

            const ctaHref = plan.id === "FREE"
              ? loggedIn ? "/dashboard" : "/signup"
              : loggedIn
                ? `/checkout?plan=${plan.id}&billing=${billing}`
                : `/signup?plan=${plan.id}&billing=${billing}`;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative rounded-2xl transition-[transform,box-shadow] duration-200",
                  "hover:-translate-y-1 hover:shadow-lg",
                  plan.id === "STUDY" && "ring-2 ring-primary shadow-lg",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs font-semibold">{plan.badge}</Badge>
                  </div>
                )}

                <CardHeader className="pt-7 pb-4 px-6">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl mb-3", plan.iconBg)}>
                    <HugeiconsIcon icon={plan.icon} className={cn("h-5 w-5", plan.color)} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {plan.name}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">{price}</span>
                    <span className="text-xs text-muted-foreground">/{period}</span>
                  </div>
                  {annualEquiv && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      {annualEquiv} — billed annually
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                </CardHeader>

                <CardContent className="space-y-5 px-6 pb-6">
                  <Link href={ctaHref as never} className="block">
                    <Button
                      variant={plan.id === "FREE" ? "outline" : "default"}
                      className="w-full"
                    >
                      {ctaLabel}
                    </Button>
                  </Link>

                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500"
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-muted-foreground line-through"
                      >
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="h-4 w-4 mt-0.5 shrink-0 opacity-30"
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Compare plans at a glance
          </h2>
          <div className="mt-10 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Feature</th>
                  <th className="px-5 py-4 text-center">Free</th>
                  <th className="px-5 py-4 text-center text-primary">Study</th>
                  <th className="px-5 py-4 text-center">Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="bg-card">
                    <td className="px-5 py-4 font-medium">{row.label}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{row.free}</td>
                    <td className="px-5 py-4 text-center font-semibold">{row.study}</td>
                    <td className="px-5 py-4 text-center">{row.pass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pay with
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/50">
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
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border bg-white p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={label} className="h-full w-full object-contain" />
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-32">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Common questions
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map(({ q, a }) => (
              <Card key={q} className="rounded-xl">
                <CardContent className="py-5">
                  <p className="text-sm font-semibold">{q}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
