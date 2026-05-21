import type { Metadata } from "next";
import {
  AiBrain01Icon,
  ArrowRight01Icon,
  GraduationScrollIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "../_components/cta-button";
import { IllustrationPanel } from "../_components/illustration-panel";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { StatCounter } from "../_components/stat-counter";

export const metadata: Metadata = {
  title: "About Pass — Built in Zimbabwe for Zimbabwean students",
  description:
    "Why we built Pass — patient AI tutoring, every ZIMSEC past paper, made for the phones and networks Zimbabwean students actually use.",
  alternates: { canonical: "https://pass.co.zw/about" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/about",
    siteName: "Pass",
    title: "About Pass — Built in Zimbabwe",
    description:
      "Why we built Pass — patient AI tutoring, every ZIMSEC past paper, made for the phones and networks Zimbabwean students actually use.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "About Pass" }],
    locale: "en_ZW",
  },
};

const STATS = [
  { value: 140, suffix: "+", label: "Papers" },
  { value: 2000, suffix: "+", label: "Questions" },
  { value: 55, suffix: "+", label: "Subjects" },
  { value: 3, suffix: "", label: "Levels" },
];

export default function MarketingAbout() {
  return (
    <article className="bg-background">
      {/* Hero band */}
      <section className="px-6 pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionEyebrow>About Pass</SectionEyebrow>
            <SectionHeading as="h1" className="mt-4 text-4xl md:text-6xl">
              Built in Zimbabwe.{" "}
              <span className="font-marketing-serif italic font-normal">
                For Zimbabwean students.
              </span>
            </SectionHeading>
            <SectionLede className="mt-6 max-w-2xl text-lg md:text-xl">
              Pass exists because the resources Zimbabwean students need to do well — past papers,
              mark schemes, patient tutoring — shouldn&apos;t depend on what WhatsApp group
              you&apos;re in or whether your school&apos;s photocopier is working.
            </SectionLede>
          </ScrollReveal>
        </div>
      </section>

      {/* Body sections */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <ScrollReveal as="section" className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Why we built this
          </h2>
          <p className="mt-5 text-base text-foreground/80 leading-relaxed md:text-lg">
            Every year, hundreds of thousands of Zimbabwean students sit ZIMSEC exams that decide
            whether they go to A-Level, to university, to their first job. The difference between a
            strong pass and a disappointing one is often just practice — and feedback. Past papers
            do the first half. Mark schemes do the second. We put them together with an AI tutor
            that explains every answer, then made it cost less than a week of combi fares.
          </p>
        </ScrollReveal>

        <ScrollReveal as="section" className="mt-20">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
            <IllustrationPanel
              icon={AiBrain01Icon}
              caption="Built for the phone you have, on the network you actually use."
              gradient="from-indigo-600 via-indigo-700 to-violet-700"
            />
            {/* TODO landing-images: swap IllustrationPanel for a real licensed
                photograph saved at apps/web/public/landing/stock/networks.jpg.
                Unsplash query: "harare cbd street market mobile phone". */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Built for our networks
              </h2>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed md:text-lg">
                A lot of edtech is built for fast Wi-Fi and the latest iPhone. Pass is built for the
                phone you actually have, on the network you actually use. It loads quickly on 3G.
                It works on a five-year-old Android. It accepts EcoCash and OneMoney because
                that&apos;s how people actually pay here.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal as="section" className="mt-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Who we are</h2>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed md:text-lg">
                A small team of Zimbabwean engineers, teachers, and designers. We grew up writing
                ZIMSEC. We know what works. We know what doesn&apos;t.
              </p>
              <p className="mt-4 text-base text-foreground/80 leading-relaxed md:text-lg">
                We&apos;re based in Harare, with collaborators in Bulawayo and the diaspora keeping
                us honest about what the experience feels like everywhere from a Form 4 classroom
                to a Lower 6 study group at midnight.
              </p>
            </div>
            <IllustrationPanel
              icon={GraduationScrollIcon}
              caption="Zimbabwean engineers, teachers, and designers — who grew up writing ZIMSEC."
              gradient="from-violet-600 via-fuchsia-600 to-rose-500"
            />
            {/* TODO landing-images: swap IllustrationPanel for a real licensed
                photograph saved at apps/web/public/landing/stock/team.jpg.
                Unsplash query: "african tech team office laptop". */}
          </div>
        </ScrollReveal>

        <ScrollReveal as="section" className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What&apos;s next</h2>
          <p className="mt-5 text-base text-foreground/80 leading-relaxed md:text-lg">
            More past papers (we add new ones every month). More subjects in indigenous languages.
            A native iOS app. Mark scheme uploads from teachers. We&apos;re just getting started.
          </p>
        </ScrollReveal>
      </div>

      {/* Stat strip */}
      <section className="bg-muted/40 px-6 py-16">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-y-8 text-center md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <StatCounter
                value={s.value}
                suffix={s.suffix}
                className="text-3xl font-semibold tabular-nums tracking-tight md:text-4xl"
              />
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA card */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm md:p-14">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Try Pass{" "}
            <span className="font-marketing-serif italic font-normal">for free.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:text-lg">
            Five papers a month, two projects, every subject. No credit card.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaButton href="/signup" size="lg" withArrow className="min-w-[160px]">
              Start free
            </CtaButton>
            <CtaButton href="/pricing" variant="outline" size="lg" className="min-w-[160px]">
              See pricing
              <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 h-4 w-4" />
            </CtaButton>
          </div>
        </div>
      </section>
    </article>
  );
}
