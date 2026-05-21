import type { Metadata } from "next";
import { Hero } from "./_sections/hero";
import { StatsBar } from "./_sections/stats-bar";
import { FeaturePapers } from "./_sections/feature-papers";
import { FeatureAi } from "./_sections/feature-ai";
import { FeatureProjects } from "./_sections/feature-projects";
import { FeatureProgress } from "./_sections/feature-progress";
import { HowItWorks } from "./_sections/how-it-works";
import { Testimonials } from "./_sections/testimonials";
import { PricingTeaser } from "./_sections/pricing-teaser";
import { Faq } from "./_sections/faq";
import { Cta } from "./_sections/cta";

export const metadata: Metadata = {
  title: "Pass — ZIMSEC past papers + AI tutor. Built in Zimbabwe.",
  description:
    "Practice every ZIMSEC past paper with an AI tutor that explains every answer. A-Level, O-Level, Grade 7. Start free, pay with EcoCash or OneMoney.",
  alternates: { canonical: "https://pass.co.zw/" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/",
    siteName: "Pass",
    title: "Pass — ZIMSEC past papers + AI tutor",
    description:
      "Practice every ZIMSEC past paper with an AI tutor that explains every answer. A-Level, O-Level, Grade 7.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pass — Study smarter. Pass faster." }],
    locale: "en_ZW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pass — ZIMSEC past papers + AI tutor",
    description:
      "Practice every ZIMSEC past paper with an AI tutor that explains every answer.",
    images: ["/opengraph-image"],
  },
};

export default function MarketingHome() {
  return (
    <>
      <Hero />
      <StatsBar />
      <FeaturePapers />
      <FeatureAi />
      <FeatureProjects />
      <FeatureProgress />
      <HowItWorks />
      <Testimonials />
      <PricingTeaser />
      <Faq />
      <Cta />
    </>
  );
}
