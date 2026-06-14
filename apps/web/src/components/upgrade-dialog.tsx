"use client";

import { useRouter } from "next/navigation";
import { PLAN_LIMITS, type PlanKey } from "@pass/pricing";

const FEATURE_LABELS: Record<string, string> = {
  papers: "past papers",
  projects: "AI projects",
  downloads: "paper PDF downloads",
  aiMessages: "AI answers",
  attachments: "file uploads in chat",
};

interface Props {
  open: boolean;
  onClose: () => void;
  feature: "papers" | "projects" | "downloads" | "aiMessages" | "attachments";
  plan: string;
}

export function UpgradeDialog({ open, onClose, feature, plan }: Props) {
  const router = useRouter();
  if (!open) return null;

  const label = FEATURE_LABELS[feature] ?? feature;
  const limits = PLAN_LIMITS[plan as PlanKey];
  const rawLimit = limits?.[feature as keyof typeof limits] as number | undefined;
  const limitStr = rawLimit === undefined || rawLimit === Infinity ? "all" : `all ${rawLimit}`;
  const planLabel = plan === "FREE" ? "Free" : plan === "STUDY" ? "Study" : plan;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      {/* Card — stop propagation so clicking the card doesn't close */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-foreground">Upgrade your plan</h2>
        <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
          {feature === "attachments" ? (
            <>
              {label[0].toUpperCase() + label.slice(1)} are a paid feature, not available on your{" "}
              <span className="font-medium text-foreground">{planLabel}</span> plan.
              Upgrade to attach photos and PDFs to your questions.
            </>
          ) : (
            <>
              You&apos;ve used {limitStr} {label} on your <span className="font-medium text-foreground">{planLabel}</span> plan this month.
              Upgrade for higher limits and more features.
            </>
          )}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => { router.push("/checkout"); onClose(); }}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View plans
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
