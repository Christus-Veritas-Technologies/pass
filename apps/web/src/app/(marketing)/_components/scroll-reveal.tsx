"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Direction the element travels from. Default "up". */
  from?: "up" | "left" | "right" | "none";
  /** How far the element travels (px). Default 24. */
  distance?: number;
  /** Duration in seconds. Default 0.7. */
  duration?: number;
  once?: boolean;
  /** HTML element. Default "div". */
  as?: "div" | "section" | "article" | "header" | "ul" | "li" | "p";
}

export function ScrollReveal({
  children,
  delay = 0,
  className,
  from = "up",
  distance = 24,
  duration = 0.7,
  once = true,
  as = "div",
}: Props) {
  const reduceMotion = useReducedMotion();

  const initial = (() => {
    if (reduceMotion || from === "none") return { opacity: 0 };
    if (from === "left") return { opacity: 0, x: -distance };
    if (from === "right") return { opacity: 0, x: distance };
    return { opacity: 0, y: distance };
  })();

  const variants: Variants = {
    hidden: initial,
    visible: { opacity: 1, x: 0, y: 0 },
  };

  const Motion = motion[as] as typeof motion.div;

  return (
    <Motion
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={variants}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration, delay, ease: [0.23, 1, 0.32, 1] }
      }
      className={cn(className)}
    >
      {children}
    </Motion>
  );
}
