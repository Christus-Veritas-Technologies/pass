"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft01Icon, BankIcon, CrownIcon, Loading01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { authedRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PLANS as PLAN_DATA, type BillingCycle } from "@pass/pricing";

type Billing = BillingCycle;

const PLAN_META = {
  STUDY: { icon: SparklesIcon, color: "text-primary",   iconBg: "bg-primary/10" },
  PASS:  { icon: CrownIcon,    color: "text-amber-500", iconBg: "bg-amber-50"   },
} as const;

const CHECKOUT_PLANS = {
  STUDY: { ...PLAN_DATA.STUDY, ...PLAN_META.STUDY },
  PASS:  { ...PLAN_DATA.PASS,  ...PLAN_META.PASS  },
} as const;

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") as "STUDY" | "PASS") || "STUDY";
  const billingParam = (searchParams.get("billing") as Billing) || "MONTHLY";

  const [selectedPlan, setSelectedPlan] = useState<"STUDY" | "PASS">(planParam);
  const [billing, setBilling] = useState<Billing>(billingParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = CHECKOUT_PLANS[selectedPlan];
  const amount = plan.prices[billing];

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authedRequest<{
        success: boolean;
        redirectUrl: string;
        paynowRef: string;
      }>("/payments/create", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan, billingCycle: billing }),
      });

      if (response.success && response.redirectUrl) {
        sessionStorage.setItem("paynow_ref", response.paynowRef);
        window.location.href = response.redirectUrl;
      } else {
        setError("Failed to initiate payment. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error)?.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Upgrade your plan</h1>
          <p className="text-sm text-muted-foreground">Choose a plan and start studying smarter</p>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="inline-flex items-center rounded-xl border bg-muted/50 p-1 gap-1">
        <button
          onClick={() => setBilling("MONTHLY")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
            billing === "MONTHLY" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("ANNUAL")}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5",
            billing === "ANNUAL" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            Save 44%
          </span>
        </button>
      </div>

      {/* Plan selector */}
      <div className="grid gap-4 grid-cols-2">
        {(["STUDY", "PASS"] as const).map((planKey) => {
          const p = CHECKOUT_PLANS[planKey];
          return (
            <button
              key={planKey}
              onClick={() => setSelectedPlan(planKey)}
              className={cn(
                "rounded-xl border-2 p-4 transition-all text-left",
                selectedPlan === planKey
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50 bg-background"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", p.iconBg)}>
                  <HugeiconsIcon icon={p.icon} className={cn("h-4 w-4", p.color)} />
                </div>
                <span className="text-xs font-semibold text-primary">
                  ${p.prices[billing].toFixed(2)}
                </span>
              </div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </button>
          );
        })}
      </div>

      {/* Order summary */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold">Order summary</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{plan.name} plan</span>
            <span className="font-medium">USD {amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Billing period</span>
            <span className="font-medium">{billing === "ANNUAL" ? "1 year" : "1 month"}</span>
          </div>
          {billing === "ANNUAL" && (
            <div className="flex items-center justify-between text-xs text-emerald-600">
              <span>Annual saving</span>
              <span className="font-medium">
                USD {((plan.prices.MONTHLY * 12) - amount).toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t pt-3 flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span>USD {amount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold">What&apos;s included</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <span className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* CTA */}
      <div className="space-y-3">
        <Button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full h-11 rounded-lg"
        >
          {loading ? (
            <>
              <HugeiconsIcon icon={Loading01Icon} className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay now"
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          You&apos;ll be redirected to Paynow to complete your payment securely. Cancel anytime from your settings.
        </p>
      </div>

      {/* Accepted payment methods */}
      <div className="border-t pt-6">
        <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-4">Accepted payment methods</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-lg border bg-muted/50 flex items-center justify-center">
              <HugeiconsIcon icon={BankIcon} className="h-4 w-4 text-muted-foreground" />
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
              <div className="h-10 w-10 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="h-full w-full object-contain" />
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
