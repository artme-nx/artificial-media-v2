import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageMotion } from "@/components/page-motion";
import { StatusOverlay } from "@/components/status-overlay";
import { StageCanvas } from "@/components/stage/stage-canvas";
import { IntroSection } from "@/components/sections/intro";
import { ManifestSection } from "@/components/sections/manifest";
import { ReelsSection } from "@/components/sections/reels";
import { WorldsSection } from "@/components/sections/worlds";
import { CursorStageSection } from "@/components/sections/cursor-stage";
import { ServicesSection } from "@/components/sections/services";
import { WhyAiSection } from "@/components/sections/why-ai";
import { CtaSection } from "@/components/sections/cta";
import { FaqSection } from "@/components/sections/faq";

/** Redoslijed sekcija: 11 §4 (0–11). /start je zasebna stranica (red 12). */
export default function Home() {
  return (
    <>
      <StageCanvas />
      <SiteNav />
      <main id="main">
        <IntroSection />
        <ManifestSection />
        <ReelsSection />
        <WorldsSection />
        <CursorStageSection />
        <ServicesSection />
        <WhyAiSection />
        <CtaSection />
        <FaqSection />
      </main>
      <SiteFooter />
      <PageMotion />
      <StatusOverlay />
    </>
  );
}
