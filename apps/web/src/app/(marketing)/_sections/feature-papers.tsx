import {
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { SubjectMarquee } from "../_components/subject-marquee";

const BULLETS = [
  "Mathematics, Sciences, Languages, Humanities — 55+ subjects",
  "Searchable by subject, year, grade, and topic",
  "View the original PDF or work through it question-by-question",
  "New papers added every month",
];

export function FeaturePapers() {
  return (
    <section id="features" className="relative bg-background px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image */}
          <ScrollReveal from="left" className="order-2 lg:order-1">
            {/* TODO landing-images: replace placeholder with
                apps/web/public/landing/feature-papers.png — screenshot of /papers
                (filter chips + paper grid). */}
            <div className="relative aspect-[16/10] rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/[0.05]">
              {/* Faux filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {["All", "Mathematics", "Combined Science", "Shona", "History"].map((s, i) => (
                  <span
                    key={s}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      i === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              {/* Faux paper grid */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  { subject: "Mathematics", title: "Paper 1 — November", grade: "A-Level", year: 2025, tone: "blue" },
                  { subject: "Combined Science", title: "Paper 2 — June", grade: "O-Level", year: 2025, tone: "purple" },
                  { subject: "Mathematics", title: "Paper 2 — November", grade: "A-Level", year: 2024, tone: "blue" },
                  { subject: "Geography", title: "Paper 1 — June", grade: "O-Level", year: 2025, tone: "teal" },
                ].map((p) => (
                  <div
                    key={`${p.subject}-${p.year}-${p.title}`}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                          p.tone === "blue"
                            ? "bg-blue-50 text-blue-700"
                            : p.tone === "purple"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-teal-50 text-teal-700"
                        }`}
                      >
                        {p.subject}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                        <HugeiconsIcon icon={Calendar01Icon} className="h-2.5 w-2.5" />
                        {p.year}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-foreground">
                      {p.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded-md border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {p.grade}
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="h-2.5 w-2.5 text-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Text */}
          <ScrollReveal from="right" delay={0.1} className="order-1 lg:order-2">
            <SectionEyebrow>01 &mdash; Past papers</SectionEyebrow>
            <SectionHeading className="mt-3">
              Every ZIMSEC paper you&apos;ll ever sit.{" "}
              <span className="font-marketing-serif italic font-normal">In one place.</span>
            </SectionHeading>
            <SectionLede className="mt-5">
              No more digging through WhatsApp groups for last year&apos;s Maths paper. We&apos;ve
              collected and parsed every recent past paper, by subject and level, ready to practice
              the moment you open the app.
            </SectionLede>

            <ul className="mt-7 space-y-3">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/85">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="h-5 w-5 mt-0.5 shrink-0 text-primary"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4" />
              Browse the library after signup &rarr;
            </div>
          </ScrollReveal>
        </div>

        {/* Subject marquee */}
        <ScrollReveal delay={0.2} className="mt-16">
          <SubjectMarquee />
        </ScrollReveal>
      </div>
    </section>
  );
}
