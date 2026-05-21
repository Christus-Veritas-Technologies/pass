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
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: ZapIcon,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    highlights: ["5 past papers / month", "2 AI projects / month", "Basic marking"],
    badge: null as string | null,
  },
  {
    id: "STUDY",
    name: "Study",
    price: "$2.99",
    period: "per month",
    icon: SparklesIcon,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    highlights: ["12 papers / month", "Detailed AI explanations", "Progress tracking"],
    badge: "Most popular",
  },
  {
    id: "PASS",
    name: "Pass",
    price: "$5.99",
    period: "per month",
    icon: CrownIcon,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    highlights: ["20 papers / month", "Full worked solutions", "Priority support"],
    badge: null,
  },
];

export function PricingTeaser() {
  return (
    <section className="bg-background px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionHeading className="mt-3">
            One price. Every subject.{" "}
            <span className="font-marketing-serif italic font-normal">Cancel anytime.</span>
          </SectionHeading>
          <SectionLede className="mx-auto mt-5 text-center">
            Free forever for 5 papers a month. Or unlock the full library from $2.99/month.
          </SectionLede>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.id} delay={i * 0.08}>
              <div
                className={cn(
                  "relative h-full rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md md:p-7",
                  plan.id === "STUDY" && "ring-2 ring-primary shadow-lg",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs font-semibold">{plan.badge}</Badge>
                  </div>
                )}
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", plan.iconBg)}>
                  <HugeiconsIcon icon={plan.icon} className={cn("h-5 w-5", plan.iconColor)} />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {plan.name}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">/{plan.period}</span>
                </div>
                <ul className="mt-5 space-y-2">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500"
                      />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.24} className="mt-10 flex justify-center">
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="rounded-lg">
              See full pricing &rarr;
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
