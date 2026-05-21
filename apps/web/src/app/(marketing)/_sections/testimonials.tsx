import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";
import { TestimonialCard } from "../_components/testimonial-card";

// NOTE: These are realistic placeholder quotes — swap for real consented
// testimonials before public launch. See LANDING_PAGE_PLAN.md §11.
const TESTIMONIALS = [
  {
    quote:
      "My Maths jumped two grades in one term. The AI explained mistakes the way my teacher couldn't.",
    author: "Tanaka M.",
    context: "Form 4, Prince Edward School (Harare)",
  },
  {
    quote:
      "Used to dread Combined Science. Now I do a paper every Saturday morning before chores.",
    author: "Rumbidzai N.",
    context: "Form 3, Dominican Convent (Bulawayo)",
  },
  {
    quote:
      "As a parent, I finally see exactly what my son is studying and where he's stuck. Worth every cent.",
    author: "Mr. Chigumira",
    context: "Parent of two A-Level students",
  },
  {
    quote:
      "I generated my Agriculture project in 20 minutes. Spent the rest of the week actually understanding it.",
    author: "Tinashe G.",
    context: "Lower 6, St. George's College (Harare)",
  },
  {
    quote:
      "I teach Form 5 Geography. I recommend Pass to every student — the past paper coverage is unmatched.",
    author: "Mrs. Moyo",
    context: "Geography teacher, Mutare",
  },
  {
    quote:
      "Cheaper than two combies a week. And it works on my mum's old phone.",
    author: "Privilege S.",
    context: "Form 6, Gokomere High (Masvingo)",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/40 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Loved across Zimbabwe</SectionEyebrow>
          <SectionHeading className="mt-3">
            From Harare{" "}
            <span className="font-marketing-serif italic font-normal">to Hwange.</span>
          </SectionHeading>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.author} delay={i * 0.06}>
              <TestimonialCard quote={t.quote} author={t.author} context={t.context} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
