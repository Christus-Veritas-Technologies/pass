"use client";

import {
  BookOpen01Icon,
  SparklesIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion } from "framer-motion";
import { CtaButton } from "../_components/cta-button";
import { ChromeFrame } from "../_components/chrome-frame";
import { GradientOrb } from "../_components/gradient-orb";

const EASE = [0.23, 1, 0.32, 1] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();
  const t = (delay: number) =>
    reduceMotion ? { duration: 0 } : { duration: 0.7, delay, ease: EASE };

  return (
    <section className="relative isolate overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      {/* Decorative orbs */}
      <GradientOrb
        color="bg-indigo-500/25"
        size="w-[42rem] h-[42rem]"
        className="-top-40 -right-40"
      />
      <GradientOrb
        color="bg-violet-500/25"
        size="w-[36rem] h-[36rem]"
        className="-bottom-40 -left-40"
        duration={12}
      />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0)}
          className="flex justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Built for ZIMSEC — A-Level, O-Level, Grade 7
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0.08)}
          className="mx-auto mt-6 max-w-4xl text-center text-5xl font-semibold tracking-[-0.04em] leading-[1.02] md:text-7xl"
        >
          Study{" "}
          <span className="font-marketing-serif italic font-normal">smarter</span>.
          <br />
          Pass faster.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0.16)}
          className="mx-auto mt-6 max-w-2xl text-center text-base text-muted-foreground md:text-xl md:leading-relaxed"
        >
          The fastest way to prep for ZIMSEC. Practice every past paper with an AI tutor that grades
          your work, explains the mark scheme, and writes your projects — from Harare to Hwange.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0.24)}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <CtaButton href="/signup" size="lg" withArrow className="min-w-[160px]">
            Start free
          </CtaButton>
          <CtaButton href="#how-it-works" variant="outline" size="lg" className="min-w-[160px]">
            See how it works
          </CtaButton>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t(0.32)}
          className="mt-4 text-center text-xs text-muted-foreground"
        >
          No credit card. 5 papers free every month. Cancel anytime.
        </motion.p>

        {/* Product mock */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.9, delay: 0.4, ease: EASE }
          }
          className="relative mx-auto mt-16 max-w-5xl"
        >
          {/* Soft drop shadow */}
          <div className="absolute -inset-x-12 -bottom-12 -top-4 -z-10 rounded-[3rem] bg-foreground/[0.03] blur-2xl" />

          <ChromeFrame>
            {/* TODO landing-images: replace this composite with a real screenshot
                composited from /papers/[id] (study view) + AI explanation card.
                Save to apps/web/public/landing/hero-product.png and swap in. */}
            <div className="grid aspect-[16/10] grid-cols-1 gap-0 md:grid-cols-[1.4fr_1fr]">
              {/* Left: faux study screen */}
              <div className="border-r border-border bg-card p-6 md:p-8">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                    Mathematics
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    A-Level · 2025
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold text-muted-foreground">Question 4 / 12</p>
                <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                  Solve the equation 3x² − 5x − 2 = 0, giving your answers to two decimal places.
                </h3>
                <div className="mt-5 rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your answer
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Using the quadratic formula:
                    <br />
                    x = (5 ± √(25 + 24)) / 6
                    <br />
                    x = 2.00 or x = −0.33
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    Previous
                  </span>
                  <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                    Mark answer
                  </span>
                </div>
              </div>

              {/* Right: AI panel */}
              <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/60 dark:to-violet-950/60 p-6 md:p-8">
                <div className="flex items-center gap-2 text-primary">
                  <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Pass AI · Marking
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-emerald-600">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                  <span className="text-sm font-semibold">5/5 marks awarded</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-foreground/80">
                  Excellent work. You earned all marking points:
                </p>
                <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-foreground/80">
                  <li className="flex gap-1.5">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500"
                    />
                    Used quadratic formula correctly (M1)
                  </li>
                  <li className="flex gap-1.5">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500"
                    />
                    Substituted values accurately (A1)
                  </li>
                  <li className="flex gap-1.5">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500"
                    />
                    Both roots given to 2 dp (A1 × 2)
                  </li>
                </ul>
                <div className="mt-5 rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <HugeiconsIcon icon={BookOpen01Icon} className="h-3 w-3" />
                    Tip
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/70 leading-relaxed">
                    Always write the formula before substituting — examiners award method marks
                    even if your arithmetic slips later.
                  </p>
                </div>
              </div>
            </div>
          </ChromeFrame>
        </motion.div>
      </div>
    </section>
  );
}
