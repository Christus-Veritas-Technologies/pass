import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface Props {
  icon: IconSvgElement;
  caption: string;
  /** Tailwind gradient classes — e.g. "from-indigo-500 to-violet-600". */
  gradient: string;
  className?: string;
}

/**
 * A decorative aspect-ratio panel — gradient background with a centred
 * icon and small caption. Used in /about where real photography hasn't
 * been licensed yet.
 *
 * To swap in a real Unsplash photo: replace with <Image> at the same
 * aspect ratio, alt-text matching the caption.
 */
export function IllustrationPanel({ icon, caption, gradient, className }: Props) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] overflow-hidden rounded-2xl text-white shadow-xl",
        "bg-gradient-to-br",
        gradient,
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-7 md:p-8">
        <HugeiconsIcon icon={icon} className="h-8 w-8 text-white/85" />
        <p className="font-marketing-serif text-2xl italic font-normal leading-tight text-white/95 md:text-3xl">
          &ldquo;{caption}&rdquo;
        </p>
      </div>
    </div>
  );
}
