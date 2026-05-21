import {
  ChartIncreaseIcon,
  FireIcon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { ProgressCard } from "../_components/progress-card";

export function FeatureProgress() {
  return (
    <section className="bg-muted/30 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>04 &mdash; Progress</SectionEyebrow>
          <SectionHeading className="mt-3">
            See yourself{" "}
            <span className="font-marketing-serif italic font-normal">getting better.</span>
          </SectionHeading>
          <SectionLede className="mx-auto mt-5 text-center">
            Streaks, weekly goals, papers attempted, accuracy by subject. Pass tracks the small
            wins that add up to a strong exam day.
          </SectionLede>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          <ScrollReveal delay={0}>
            <ProgressCard
              icon={FireIcon}
              value="14"
              label="Day streak"
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
            />
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <ProgressCard
              icon={TaskDaily01Icon}
              value="28"
              label="Papers attempted"
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
          </ScrollReveal>
          <ScrollReveal delay={0.16}>
            <ProgressCard
              icon={ChartIncreaseIcon}
              value="4/5"
              label="Weekly goal"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              progress={{ value: 4, max: 5 }}
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
