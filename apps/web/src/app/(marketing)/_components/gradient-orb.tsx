"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Tailwind background class — e.g. "bg-indigo-500/30". */
  color?: string;
  /** Diameter in tailwind units. Default "w-96 h-96". */
  size?: string;
  /** Animation duration in seconds. Default 10. */
  duration?: number;
  /** Animate intensity. If false, renders a static blurred blob. */
  animate?: boolean;
}

export function GradientOrb({
  className,
  color = "bg-indigo-500/30",
  size = "w-[36rem] h-[36rem]",
  duration = 10,
  animate = true,
}: Props) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        size,
        color,
        className,
      )}
      animate={
        shouldAnimate
          ? { scale: [1, 1.08, 1], opacity: [0.7, 0.9, 0.7] }
          : undefined
      }
      transition={
        shouldAnimate
          ? { duration, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    />
  );
}
