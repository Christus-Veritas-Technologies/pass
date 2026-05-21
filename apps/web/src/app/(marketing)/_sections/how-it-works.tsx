import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

const STEPS = [
  {
    num: "01",
    title: "Sign up free",
    body: "Make an account in 30 seconds. No credit card. 5 papers and 2 AI projects every month — forever.",
  },
  {
    num: "02",
    title: "Pick a paper, start practising",
    body: "Choose your subject and level. Work through questions, get them marked by AI, see exactly where the marks come from.",
  },
  {
    num: "03",
    title: "Stay sharp until exam day",
    body: "Build a streak, track your weekly goal, and walk into ZIMSEC knowing you've already seen these questions.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-background px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>How it works</SectionEyebrow>
          <SectionHeading className="mt-3">
            Three steps to a{" "}
            <span className="font-marketing-serif italic font-normal">stronger pass.</span>
          </SectionHeading>
        </ScrollReveal>

        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.08}>
              <div className="relative">
                <span
                  aria-hidden
                  className="font-marketing-serif text-7xl font-normal italic text-primary/15"
                >
                  {step.num}
                </span>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
