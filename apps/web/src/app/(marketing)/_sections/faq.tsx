import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { FaqAccordion } from "../_components/faq-accordion";

const FAQS = [
  {
    q: "Is Pass really free?",
    a: "Yes — the Free plan gives you 5 past papers and 2 AI-generated projects every single month. No credit card, no trial countdown.",
  },
  {
    q: "Which subjects do you cover?",
    a: "Every major ZIMSEC subject for O-Level and A-Level, plus Grade 7. Mathematics, Sciences, Languages (English, Shona, Ndebele), Humanities (History, Geography), Commerce, Accounting, Agriculture, and more — 55+ in total.",
  },
  {
    q: "How does the AI know the mark scheme?",
    a: "We've parsed the official ZIMSEC mark scheme for every paper in the library. Pass AI grades your answer against that scheme — it's not just guessing.",
  },
  {
    q: "Can I use Pass on my phone?",
    a: "Yes. The web app works on any phone with a browser, and we have a native Android app on the Play Store (iOS coming). It's designed for low-data Zimbabwean networks.",
  },
  {
    q: "How do I pay?",
    a: "EcoCash, OneMoney, Omari, InnBucks, or direct bank transfer. All ZWL. We don't ask for international cards.",
  },
  {
    q: "What if I'm not happy?",
    a: "Cancel anytime from your profile. You keep access until the end of the period you've already paid for.",
  },
];

export function Faq() {
  return (
    <section className="bg-background px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal className="text-center">
          <SectionEyebrow>Common questions</SectionEyebrow>
          <SectionHeading className="mt-3">
            Everything you might{" "}
            <span className="font-marketing-serif italic font-normal">be wondering.</span>
          </SectionHeading>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-12">
          <FaqAccordion items={FAQS} />
        </ScrollReveal>
      </div>
    </section>
  );
}
