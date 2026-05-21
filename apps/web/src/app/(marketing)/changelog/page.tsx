import type { Metadata } from "next";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

export const metadata: Metadata = {
  title: "Changelog — Pass",
  description:
    "What's new in Pass — updates, improvements, and new features for Zimbabwean students.",
  alternates: { canonical: "https://pass.co.zw/changelog" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/changelog",
    siteName: "Pass",
    title: "Changelog — Pass",
    description: "What's new in Pass.",
    locale: "en_ZW",
  },
};

const ENTRIES = [
  {
    version: "1.2",
    date: "May 2026",
    tag: "Feature",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    title: "WhatsApp study bot",
    items: [
      "Study ZIMSEC past papers directly from WhatsApp — no app install required.",
      "Natural-language AI tutor: ask questions in your own words and get explanations.",
      "In-chat upgrade via EcoCash or OneMoney.",
      "Link your Pass account to your WhatsApp number with a one-time code.",
    ],
  },
  {
    version: "1.1",
    date: "May 2026",
    tag: "Feature",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    title: "Dark mode and theme toggle",
    items: [
      "Full dark mode across the web app, marketing site, and mobile app.",
      "Light / Dark / System toggle in the nav, app sidebar, and mobile profile screen.",
      "All pages audited for contrast compliance.",
    ],
  },
  {
    version: "1.0",
    date: "May 2026",
    tag: "Launch",
    tagColor: "bg-foreground/10 text-foreground",
    title: "Pass launches",
    items: [
      "140+ ZIMSEC past papers across A-Level and O-Level, with 2,000+ structured questions.",
      "AI tutor that grades free-response answers and explains mark-scheme reasoning.",
      "Project generator: describe a topic, receive a complete A-Level project brief.",
      "Free tier: 5 papers and 2 projects per month, no credit card required.",
      "Study and Pass subscription plans via EcoCash, OneMoney, and card.",
      "Native Android app with offline paper viewing.",
      "Pagination on all paper, resource, and project lists.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article className="bg-background">
      <section className="px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionEyebrow>What&apos;s new</SectionEyebrow>
            <SectionHeading as="h1" className="mt-4 text-4xl md:text-5xl">
              Changelog
            </SectionHeading>
            <SectionLede className="mt-5 max-w-2xl">
              Every update to Pass, newest first. We ship frequently and aim to stay honest about
              what we&apos;re building.
            </SectionLede>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="relative mt-2 pl-6 before:absolute before:left-0 before:top-2 before:h-full before:w-px before:bg-border">
          {ENTRIES.map((entry) => (
            <ScrollReveal key={entry.version} className="relative mb-14">
              {/* Timeline dot */}
              <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-foreground ring-4 ring-background" />
              </span>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.tagColor}`}
                >
                  {entry.tag}
                </span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>

              <h2 className="mt-3 text-lg font-semibold text-foreground tracking-tight md:text-xl">
                {entry.title}
              </h2>

              <ul className="mt-4 space-y-2">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/70">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            More updates are on the way — new subjects, more past papers, iOS app, and teacher
            mark-scheme uploads. Follow us on social media or email{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>{" "}
            to be notified.
          </div>
        </ScrollReveal>
      </div>
    </article>
  );
}
