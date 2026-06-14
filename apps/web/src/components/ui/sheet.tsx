"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  className?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, side = "left", className, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const panelClasses = cn(
    "fixed z-50 flex flex-col border-border bg-background transition-transform duration-200 ease-in-out",
    side === "bottom"
      ? cn("inset-x-0 bottom-0 border-t rounded-t-2xl", open ? "translate-y-0" : "translate-y-full")
      : cn(
          "inset-y-0",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          side === "left"
            ? open ? "translate-x-0" : "-translate-x-full"
            : open ? "translate-x-0" : "translate-x-full",
        ),
    className,
  );

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      {/* Panel */}
      <aside role="dialog" aria-modal="true" className={panelClasses}>
        {children}
      </aside>
    </>
  );
}
