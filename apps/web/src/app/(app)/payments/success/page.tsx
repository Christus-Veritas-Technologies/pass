"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader } from "@pass/ui/components/card";
import { authedRequest } from "@/lib/auth";

interface SubscriptionInfo {
  plan: string;
  status: string;
  expiryDate: string;
  daysRemaining: number;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await authedRequest<SubscriptionInfo>("/payments/renewal-status", { method: "GET" });
        setSubscription(data);
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
        setError("Failed to load subscription details");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="h-8 w-8 text-emerald-600"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Payment successful!</h1>
        <p className="text-sm text-muted-foreground">
          Your upgrade is complete. Let's get back to studying.
        </p>
      </div>

      {/* Subscription Details */}
      {loading ? (
        <Card className="rounded-xl">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              Loading subscription details...
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-xl border-destructive/50">
          <CardContent className="py-6">
            <p className="text-sm text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      ) : subscription ? (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <p className="text-sm font-semibold">Your subscription</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-semibold capitalize">{subscription.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-semibold text-emerald-600 capitalize">
                {subscription.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires</span>
              <span className="font-semibold">
                {formatDate(subscription.expiryDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Days remaining</span>
              <span className="font-semibold text-primary">
                {subscription.daysRemaining} days
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Next Steps */}
      <Card className="rounded-xl bg-primary/5">
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold">What's next?</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm">
              <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </span>
              <span>Head to the papers section to start studying</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </span>
              <span>Choose a past paper and select GUIDE mode for AI feedback</span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </span>
              <span>Review your progress analytics in the dashboard</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* CTAs */}
      <div className="space-y-3">
        <Button
          onClick={() => router.push("/papers")}
          className="w-full h-11 rounded-lg"
        >
          Start studying
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="w-full h-11 rounded-lg"
        >
          Go to dashboard
        </Button>
      </div>

      {/* Support Info */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@pass.app" className="text-primary hover:underline">
            support@pass.app
          </a>
        </p>
      </div>
    </div>
  );
}
