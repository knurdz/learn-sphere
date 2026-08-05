import type { Metadata } from "next";
import { HeroShowcase } from "./components/hero-showcase";
import { LandingNav } from "./components/landing-nav";
import { FaqSection } from "./components/landing-faq";
import {
  AboutSection,
  DownloadCtaSection,
  FeatureCardsSection,
  HowItWorksSection,
  MarqueeSection,
  SiteFooter,
  ToolsSection,
  TrustRow,
} from "./components/landing-sections";
import { resolveAndroidDownloadUrl } from "@/lib/github-release";

export const metadata: Metadata = {
  title: "LearnSphere — Your AI study companion",
  description:
    "Live AI tutor on video, RAG-grounded chat, learning feed, study tools, Sphere coach, and 24 languages—built around your study spaces.",
  openGraph: {
    title: "LearnSphere — Your AI study companion",
    description:
      "Voice-first tutoring grounded in your PDFs, notes, and videos. Android available now.",
    type: "website",
  },
};

function downloadLabel(versionLabel: string | null, short = false): string {
  if (!versionLabel) return short ? "Download Android" : "Download Android APK";
  return short ? `Download ${versionLabel}` : `Download Android (${versionLabel})`;
}

export default async function Home() {
  const androidDownload = await resolveAndroidDownloadUrl();
  const downloadUrl = androidDownload.url;

  return (
    <div className="landing">
      <div className="landing-glow landing-glow--tl" aria-hidden />
      <div className="landing-glow landing-glow--br" aria-hidden />

      <div className="landing-shell">
        <div id="hero" className="hero">
          <LandingNav downloadUrl={downloadUrl} />
          <HeroShowcase downloadUrl={downloadUrl} />
        </div>
      </div>

      <MarqueeSection />

      <div className="landing-shell landing-main">
        <TrustRow />
        <FeatureCardsSection />
        <AboutSection />
        <HowItWorksSection />
        <ToolsSection />
        <FaqSection />
        <DownloadCtaSection
          downloadUrl={downloadUrl}
          downloadLabel={downloadLabel(androidDownload.versionLabel)}
        />
        <SiteFooter />
      </div>
    </div>
  );
}
