import type { Metadata } from "next";
import { HeroShowcase } from "./components/hero-showcase";
import { LandingNav } from "./components/landing-nav";
import { FaqSection } from "./components/landing-faq";
import {
  DownloadCtaSection,
  FeatureCardsSection,
  HowItWorksSection,
  MarqueeSection,
  SiteFooter,
  ToolsSection,
  TrustRow,
} from "./components/landing-sections";
import { ANDROID_DOWNLOAD_PATH, resolveAndroidDownloadUrl } from "@/lib/github-release";

/** Re-resolve the newest release tag for the download button label on each request. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "LearnSphere: Your AI study companion",
  description:
    "Live AI tutor on video, RAG-grounded chat, learning feed, study tools, Sphere coach, and 24 languages, built around your study spaces.",
  openGraph: {
    title: "LearnSphere: Your AI study companion",
    description:
      "Voice-first tutoring grounded in your PDFs, notes, and videos. Android available now.",
    type: "website",
  },
};

export default async function Home() {
  const androidDownload = await resolveAndroidDownloadUrl();
  const downloadUrl = ANDROID_DOWNLOAD_PATH;

  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="landing-glow landing-glow--tl" aria-hidden />
      <div className="landing-glow landing-glow--br" aria-hidden />

      <div className="landing-shell">
        <div id="hero" className="hero">
          <LandingNav downloadUrl={downloadUrl} />
          <HeroShowcase downloadUrl={downloadUrl} versionLabel={androidDownload.versionLabel} />
        </div>
      </div>

      <MarqueeSection />

      <main id="main" className="landing-shell landing-main">
        <TrustRow />
        <FeatureCardsSection />
        <HowItWorksSection />
        <ToolsSection />
        <FaqSection />
        <DownloadCtaSection
          downloadUrl={downloadUrl}
          versionLabel={androidDownload.versionLabel}
        />
        <SiteFooter downloadUrl={downloadUrl} />
      </main>
    </div>
  );
}
