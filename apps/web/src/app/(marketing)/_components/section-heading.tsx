import { cn } from "@/lib/utils";

export function SectionHeading({
  children,
  className,
  as: As = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <As
      className={cn(
        "text-3xl font-semibold tracking-[-0.03em] leading-[1.05] md:text-5xl",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionLede({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-base text-muted-foreground md:text-lg leading-relaxed max-w-xl", className)}>
      {children}
    </p>
  );
}
