import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Progress } from "@pass/ui/components/progress";
import { cn } from "@/lib/utils";

interface Props {
  icon: IconSvgElement;
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
  /** When provided, renders a progress bar below the value. */
  progress?: { value: number; max: number };
}

export function ProgressCard({ icon, value, label, iconBg, iconColor, progress }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
        <HugeiconsIcon icon={icon} className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {progress && (
        <Progress value={progress.value} max={progress.max} className="mt-4 h-1.5" />
      )}
    </div>
  );
}
