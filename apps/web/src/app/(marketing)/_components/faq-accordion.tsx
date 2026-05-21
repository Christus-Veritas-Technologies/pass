"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

interface Item {
  q: string;
  a: string;
}

interface Props {
  items: Item[];
}

export function FaqAccordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-background">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:px-6"
            >
              <span className="text-base font-semibold text-foreground md:text-lg">{item.q}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed md:px-6 md:text-base">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
