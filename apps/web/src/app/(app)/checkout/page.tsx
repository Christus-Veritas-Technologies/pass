"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft01Icon, CrownIcon, Loading01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { authedRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PLANS = {
  STUDY: {
    name: "Study",
    price: "$2.99",
    period: "month",
    icon: SparklesIcon,
    color: "text-primary",
    features: [
      "12 past papers per month",
      "7 AI projects per month",
      "Detailed answer explanations",
      "Email support",
    ],
    description: "Perfect for focused exam preparation",
  },
  PASS: {
    name: "Pass",
    price: "$5.99",
    period: "month",
    icon: CrownIcon,
    color: "text-amber-500",
    features: [
      "20 past papers per month",
      "12 AI projects per month",
      "Detailed worked solutions",
      "Priority support",
      "Full progress analytics",
    ],
    description: "Maximum exam coverage and support",
  },
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") as "STUDY" | "PASS" || "STUDY";

  const [selectedPlan, setSelectedPlan] = useState<"STUDY" | "PASS">(planParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[selectedPlan];
  const amount = selectedPlan === "STUDY" ? 2.99 : 5.99;

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
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (response.success && response.redirectUrl) {
        // Store reference for later use if needed, then redirect to Paynow
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
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Upgrade your plan</h1>
          <p className="text-sm text-muted-foreground">Choose a plan and start studying smarter</p>
        </div>
      </div>

      {/* Plan selector */}
      <div className="grid gap-4 grid-cols-2">
        {(["STUDY", "PASS"] as const).map((planKey) => {
          const p = PLANS[planKey];
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
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", planKey === "PASS" ? "bg-amber-50" : "bg-primary/10")}>
                  <HugeiconsIcon icon={p.icon} className={cn("h-4 w-4", p.color)} />
                </div>
                <span className="text-xs font-semibold text-primary">{p.price}</span>
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
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Billing period</span>
            <span className="font-medium">1 month</span>
          </div>
          <div className="border-t pt-3 flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span>USD {amount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold">What's included</p>
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
          You'll be redirected to Paynow to complete your payment securely. Cancel anytime from your settings.
        </p>
      </div>
    </div>
  );
}
