import { cn } from "@/lib/utils";

/**
 * A faux browser window frame around a child (typically a product screenshot
 * or placeholder). The three coloured dots top-left echo macOS Safari.
 */
export function ChromeFrame({
  children,
  className,
  url = "pass.co.zw",
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-foreground/10 bg-card shadow-2xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="rounded-md bg-background/80 px-3 py-0.5 text-xs text-muted-foreground">
            {url}
          </span>
        </div>
        <span className="w-12" />
      </div>
      <div className="relative bg-background">{children}</div>
    </div>
  );
}
