"use client";

import { useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Cancel Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="h-8 w-8 text-destructive"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Payment cancelled</h1>
        <p className="text-sm text-muted-foreground">
          Your payment was not completed. No charges have been made to your account.
        </p>
      </div>

      {/* What Happened */}
      <Card className="rounded-xl">
        <CardContent className="py-6 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">What happened?</p>
            <p className="text-sm text-muted-foreground">
              You cancelled the payment process at Paynow. If this was accidental, you can try again.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="rounded-xl bg-amber-50 border-amber-200">
        <CardContent className="py-6">
          <p className="text-sm font-semibold mb-2">Next steps:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Review your plan choice and pricing</li>
            <li>• Try the upgrade again if you're ready</li>
            <li>• Contact support if you have questions</li>
          </ul>
        </CardContent>
      </Card>

      {/* CTAs */}
      <div className="space-y-3">
        <Button
          onClick={() => router.push("/pricing")}
          className="w-full h-11 rounded-lg"
        >
          Back to pricing
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-full h-11 rounded-lg"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 mr-2" />
          Go back
        </Button>
      </div>

      {/* Support Info */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@pass.app" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
