import {
  CheckmarkCircle01Icon,
  Folder01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

const BULLETS = [
  "ZIMSEC project format per subject and grade",
  "Streamed live as it writes — pause or restart anytime",
  "Download as PDF or copy as markdown",
  "Up to 12 generated projects per month on Pass",
];

export function FeatureProjects() {
  return (
    <section className="bg-background px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image left */}
          <ScrollReveal from="left">
            {/* TODO landing-images: replace with
                apps/web/public/landing/feature-projects.png. */}
            <div className="relative aspect-[16/10] rounded-2xl border border-border bg-card shadow-xl shadow-foreground/[0.05] overflow-hidden">
              <div className="grid h-full grid-cols-[1fr_2fr]">
                {/* Project list */}
                <div className="border-r border-border p-3 space-y-2 overflow-hidden">
                  <div className="rounded-lg bg-primary/10 ring-2 ring-primary/30 px-2.5 py-2">
                    <p className="text-[10px] font-semibold text-foreground truncate">
                      Photosynthesis
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">Biology · Form 4</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                    <p className="text-[10px] font-medium text-foreground truncate">
                      Maize value chain
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">Agriculture · Form 6</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                    <p className="text-[10px] font-medium text-foreground truncate">
                      Trade balance ZW
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">Economics · Lower 6</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-2.5 py-2 opacity-60">
                    <p className="text-[10px] font-medium truncate">
                      Quadratic functions
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">Maths · Form 4</p>
                  </div>
                </div>

                {/* Generated content */}
                <div className="p-4 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-primary">
                    <HugeiconsIcon icon={SparklesIcon} className="h-3 w-3 animate-pulse" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider">
                      Writing
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-foreground">
                    Photosynthesis in Maize Plants
                  </h3>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Biology · Form 4 · 5 pages
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-foreground">## Introduction</p>
                    <p className="text-[9px] leading-relaxed text-foreground/80">
                      Photosynthesis is the process by which green plants convert light energy into
                      chemical energy. In Zimbabwe&apos;s maize crop, this process directly determines
                      yield&hellip;
                    </p>
                    <p className="text-[10px] font-semibold text-foreground mt-2">## Objectives</p>
                    <p className="text-[9px] leading-relaxed text-foreground/80">
                      - Identify the inputs and outputs of photosynthesis
                      <br />- Investigate the effect of light intensity on rate
                      <br />- Relate findings to Zimbabwean farming practice<span className="inline-block w-1.5 h-2.5 bg-primary/60 align-middle ml-0.5 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Text right */}
          <ScrollReveal from="right" delay={0.1}>
            <SectionEyebrow>03 &mdash; Projects</SectionEyebrow>
            <SectionHeading className="mt-3">
              Turn a topic into a finished project.{" "}
              <span className="font-marketing-serif italic font-normal">In minutes.</span>
            </SectionHeading>
            <SectionLede className="mt-5">
              ZIMSEC projects are 25% of your grade in many subjects. Pass writes them in proper
              format — introduction, methodology, findings, references — for Agriculture, Commerce,
              Geography, and more. You edit, you submit.
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
              <HugeiconsIcon icon={Folder01Icon} className="h-4 w-4" />
              Generate your first project free
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
