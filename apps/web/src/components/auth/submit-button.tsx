"use client";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@pass/ui/components/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends React.ComponentProps<"button"> {
  loading?: boolean;
}

export function SubmitButton({ loading, children, className, disabled, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className={cn(
        "h-12 w-full rounded-xl font-semibold text-sm",
        "active:scale-[0.98] transition-all duration-150",
        "disabled:active:scale-100",
        className,
      )}
      {...(props as object)}
    >
      {loading && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
      {children}
    </Button>
  );
}
