"use client";

import { motion, useReducedMotion } from "framer-motion";

const SUBJECTS = [
  "Mathematics",
  "Combined Science",
  "Chemistry",
  "Biology",
  "Physics",
  "English Language",
  "English Literature",
  "Shona",
  "Ndebele",
  "History",
  "Geography",
  "Accounting",
  "Commerce",
  "Economics",
  "Agriculture",
  "Computer Science",
  "Sociology",
  "Family & Religious Studies",
  "Art",
  "Statistics",
];

export function SubjectMarquee() {
  const reduceMotion = useReducedMotion();
  // Render the list twice so the translate loop is seamless.
  const items = [...SUBJECTS, ...SUBJECTS];

  return (
    <div
      aria-label="Sample of available subjects"
      className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <motion.div
        className="flex gap-2 w-max"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 50, repeat: Infinity, ease: "linear" }
        }
      >
        {items.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80"
          >
            {s}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
