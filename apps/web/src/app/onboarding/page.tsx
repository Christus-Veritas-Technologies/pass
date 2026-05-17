"use client";

import { ChartIcon, CheckmarkCircle01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiUpdateProfile } from "@/lib/auth";

const BRAND = "oklch(0.484 0.263 277)";

const GRADE_SECTIONS = [
  { label: "O-Level", grades: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { label: "A-Level", grades: ["Form 5", "Form 6"] },
] as const;

const FEATURES: Array<{ icon: IconSvgElement; text: string }> = [
  { icon: File01Icon, text: "Past papers matched to your grade" },
  { icon: CheckmarkCircle01Icon, text: "AI marking against the ZIMSEC scheme" },
  { icon: ChartIcon, text: "Track your progress question by question" },
];

const slide = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          animate={{ width: i === step ? 20 : 6, backgroundColor: i === step ? "var(--primary)" : "#d1d5db" }}
          transition={{ duration: 0.2 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read name from localStorage (stored there by signup page via user object)
  const storedName = typeof window !== "undefined"
    ? localStorage.getItem("pass_user_name") ?? ""
    : "";
  const firstName = storedName.split(" ")[0] || "there";

  async function handleFinish() {
    if (!selected) return;
    setLoading(true);
    try {
      await apiUpdateProfile({ grade: selected });
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-black text-lg leading-none">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Pass</span>
        </div>

        <ProgressDots step={step} />

        <div className="mt-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>

            {step === 0 && (
              <motion.div
                key="welcome"
                variants={slide}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
                >
                  <motion.h1 variants={stagger} className="text-3xl font-bold tracking-tight text-foreground">
                    Hi, {firstName}.
                  </motion.h1>
                  <motion.p variants={stagger} className="text-muted-foreground mt-2 text-base leading-relaxed">
                    Let&apos;s personalise Pass for you.
                  </motion.p>

                  <motion.div variants={stagger} className="mt-8 space-y-4">
                    {FEATURES.map((f) => (
                      <div key={f.text} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={f.icon} className="w-[18px] h-[18px] text-primary" />
                        </div>
                        <p className="text-sm text-foreground/80 leading-snug">{f.text}</p>
                      </div>
                    ))}
                  </motion.div>

                  <motion.button
                    variants={stagger}
                    onClick={() => setStep(1)}
                    className="mt-10 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity"
                  >
                    Get started
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="grade"
                variants={slide}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                >
                  <motion.h1 variants={stagger} className="text-3xl font-bold tracking-tight text-foreground">
                    What grade are you in?
                  </motion.h1>
                  <motion.p variants={stagger} className="text-muted-foreground mt-2 text-base">
                    We&apos;ll show past papers matched to your level.
                  </motion.p>

                  <motion.div variants={stagger} className="mt-8 space-y-6">
                    {GRADE_SECTIONS.map((section) => (
                      <div key={section.label}>
                        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
                          {section.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {section.grades.map((grade) => (
                            <button
                              key={grade}
                              onClick={() => setSelected(grade)}
                              className={cn(
                                "h-14 rounded-xl border-[1.5px] font-semibold text-[15px] transition-all duration-150",
                                selected === grade
                                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                              )}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>

                  <motion.button
                    variants={stagger}
                    onClick={handleFinish}
                    disabled={!selected || loading}
                    className="mt-10 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : null}
                    Start studying
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
