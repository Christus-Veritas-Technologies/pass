"use client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends React.ComponentProps<"button"> {
  loading?: boolean;
}

export function SubmitButton({ loading, children, className, disabled, ...props }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={cn(
        "h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm",
        "hover:bg-primary/90 active:scale-[0.98] transition-all duration-150",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
        "flex items-center justify-center gap-2",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
