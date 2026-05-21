import { CtaButton } from "../_components/cta-button";
import { GradientOrb } from "../_components/gradient-orb";
import { ScrollReveal } from "../_components/scroll-reveal";

export function Cta() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 px-6 py-28 text-white md:px-10 md:py-36">
      {/* Dot grid */}
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
        color="bg-violet-500/30"
        size="w-[40rem] h-[40rem]"
        className="-top-40 -right-40"
        duration={14}
      />
      <GradientOrb
        color="bg-indigo-400/25"
        size="w-[36rem] h-[36rem]"
        className="-bottom-40 -left-40"
        duration={12}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-300">
            ZIMSEC 2026 starts in months.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] leading-[1.05] md:text-7xl">
            Don&apos;t walk in{" "}
            <span className="font-marketing-serif italic font-normal text-indigo-200">
              unprepared.
            </span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-base text-indigo-200 md:text-lg leading-relaxed">
            Join thousands of students already practising on Pass. Start free — your first paper is
            one click away.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.24} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaButton href="/signup" invert withArrow size="lg" className="min-w-[160px]">
            Start free
          </CtaButton>
          <CtaButton href="/pricing" ghostOnDark size="lg" className="min-w-[160px]">
            See pricing
          </CtaButton>
        </ScrollReveal>
      </div>
    </section>
  );
}
