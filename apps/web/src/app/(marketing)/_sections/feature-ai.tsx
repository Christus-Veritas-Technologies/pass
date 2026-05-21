import {
  AiBrain01Icon,
  CheckmarkCircle01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { GradientOrb } from "../_components/gradient-orb";

const BULLETS = [
  "Instant marking against the official scheme",
  "Step-by-step explanations, not just answers",
  "Exam technique tips for each question type",
  "Encouraging, never condescending",
];

export function FeatureAi() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 px-6 py-24 text-white md:px-10 md:py-32">
      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <GradientOrb
        color="bg-violet-500/25"
        size="w-[40rem] h-[40rem]"
        className="-top-40 right-0"
        duration={14}
      />
      <GradientOrb
        color="bg-indigo-400/20"
        size="w-[36rem] h-[36rem]"
        className="-bottom-40 -left-32"
        duration={12}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <ScrollReveal from="left">
            <SectionEyebrow className="text-indigo-300">02 &mdash; AI Tutor</SectionEyebrow>
            <SectionHeading className="mt-3 text-white">
              An AI that knows the{" "}
              <span className="font-marketing-serif italic font-normal text-indigo-300">
                mark scheme.
              </span>
            </SectionHeading>
            <SectionLede className="mt-5 text-indigo-200">
              Stuck on a question? Pass AI walks you through it like a patient tutor — pointing out
              where marks are earned, why your answer fell short, and how to nail the next one.
              Trained on ZIMSEC mark schemes. Speaks Zimbabwe.
            </SectionLede>

            <ul className="mt-7 space-y-3">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-indigo-100">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="h-5 w-5 mt-0.5 shrink-0 text-indigo-300"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          {/* Faux AI explanation card */}
          <ScrollReveal from="right" delay={0.1}>
            {/* TODO landing-images: replace with
                apps/web/public/landing/feature-ai.png. */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-white/5 blur-xl" />
              <div className="relative rounded-2xl bg-white p-6 text-foreground shadow-2xl shadow-indigo-950/40 ring-1 ring-white/10 md:p-8">
                <div className="flex items-center gap-2 text-primary">
                  <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Pass AI &middot; Explanation
                  </span>
                </div>

                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Question
                  </p>
                  <p className="mt-1 text-sm leading-snug">
                    Explain how rainfall patterns affect maize farming in Mashonaland East.
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 text-amber-600">
                  <HugeiconsIcon icon={AiBrain01Icon} className="h-4 w-4" />
                  <span className="text-sm font-semibold">2/4 marks &mdash; let&apos;s level up</span>
                </div>

                <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-foreground/85">
                  <p>
                    You correctly identified that maize needs reliable rainfall (1 mark) and
                    mentioned the rainy season (1 mark) &mdash; great start.
                  </p>
                  <p className="font-medium text-foreground">
                    To earn the next two marks, link <em>specific</em> rainfall data to a
                    consequence:
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-foreground/80">
                    <li>Mashonaland East averages 750&ndash;1,000 mm/year &mdash; just enough</li>
                    <li>Dry spells in Jan/Feb stress the crop during tasselling</li>
                  </ul>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <strong className="font-semibold">Exam tip:</strong> name a region <em>and</em>
                    {" "}give a number whenever you can. Examiners reward specificity.
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs">
                  <button className="text-muted-foreground hover:text-foreground">Ask follow-up</button>
                  <button className="font-semibold text-primary">Try again &rarr;</button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
