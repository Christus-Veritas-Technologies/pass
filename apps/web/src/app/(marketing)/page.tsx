import { Hero } from "./_sections/hero";
import { StatsBar } from "./_sections/stats-bar";
import { FeaturePapers } from "./_sections/feature-papers";
import { FeatureAi } from "./_sections/feature-ai";
import { FeatureProjects } from "./_sections/feature-projects";
import { FeatureProgress } from "./_sections/feature-progress";

export default function MarketingHome() {
  return (
    <>
      <Hero />
      <StatsBar />
      <FeaturePapers />
      <FeatureAi />
      <FeatureProjects />
      <FeatureProgress />
    </>
  );
}
