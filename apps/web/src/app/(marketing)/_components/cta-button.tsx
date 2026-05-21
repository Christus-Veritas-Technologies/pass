"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@pass/ui/components/button";
import { cn } from "@/lib/utils";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  /** White button on dark bg. */
  invert?: boolean;
  /** Outline-on-dark variant. */
  ghostOnDark?: boolean;
  className?: string;
}

export function CtaButton({
  href,
  children,
  variant = "default",
  size = "lg",
  withArrow = false,
  invert = false,
  ghostOnDark = false,
  className,
}: Props) {
  const isAnchor = href.startsWith("#");

  const button = (
    <Button
      variant={invert || ghostOnDark ? "outline" : variant}
      size={size}
      className={cn(
        "rounded-lg group h-11 px-5 text-sm",
        invert &&
          "bg-white text-foreground border-white hover:bg-white/90 hover:text-foreground",
        ghostOnDark &&
          "bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {children}
      {withArrow && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5"
        />
      )}
    </Button>
  );

  if (isAnchor) {
    return (
      <a href={href} className="inline-flex">
        {button}
      </a>
    );
  }

  return (
    <Link href={href as never} className="inline-flex">
      {button}
    </Link>
  );
}
