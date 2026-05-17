"use client";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

// ─── AuthInput ────────────────────────────────────────────────────────────────
// Taller, rounder, brand-focused variant of the shadcn input

interface AuthInputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground",
        "placeholder:text-muted-foreground/50",
        "transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        error
          ? "border-destructive focus-visible:ring-destructive/60"
          : "border-input hover:border-primary/40",
        className,
      )}
      {...props}
    />
  ),
);
AuthInput.displayName = "AuthInput";

// ─── FormField ────────────────────────────────────────────────────────────────
// Wraps a label + input + animated error message

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground/90 select-none"
      >
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 text-xs text-destructive overflow-hidden"
          >
            <HugeiconsIcon icon={AlertCircleIcon} className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
