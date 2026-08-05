import type { Metadata } from "next";
import {
  FeaturesExperience,
  HowItWorksSection,
} from "./components/landing-experience";
import { HeroShowcase } from "./components/hero-showcase";
import { LandingNav } from "./components/landing-nav";
import {
  DownloadCtaSection,
  MarqueeSection,
  SiteFooter,
  StatsSection,
  TestimonialsSection,
  TrustRow,
} from "./components/landing-sections";
import { FaqSection } from "./components/landing-faq";
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
  if (!versionLabel) return short ? "Download" : "Download Android APK";
  return short ? "Download" : `Download Android (${versionLabel})`;
}

export default async function Home() {
  const androidDownload = await resolveAndroidDownloadUrl();
  const downloadUrl = androidDownload.url;

  return (
    <div className="landing">
      <div className="hero-panel" id="hero">
        <div className="hero-panel-bg" aria-hidden />
        <div className="landing-shell hero-panel-inner">
          <LandingNav downloadUrl={downloadUrl} />

          <div className="hero-copy">
            <h1 className="hero-title">
              Learn <span className="hero-highlight">Beyond</span> generic chat. Study{" "}
              <span className="hero-highlight">Together</span> with your materials.
            </h1>
            <p className="hero-sub">
              LearnSphere is a mobile study companion: live video tutor with a lip-synced avatar,
              RAG-grounded chat and voice, a swipeable learning feed, video-bound study tools,
              and Sphere—your coach for streaks, XP, and daily goals. All scoped to study spaces
              you control.
            </p>
          </div>

          <HeroShowcase />

          <div className="hero-cta-block">
            <a className="btn btn-hero-cta" href={downloadUrl}>
              {downloadLabel(androidDownload.versionLabel, true)}
              <span className="btn-hero-cta-arrow" aria-hidden>
                →
              </span>
            </a>
            <p className="hero-platforms">
              <strong>Android</strong> available now · <span>iOS & Web coming soon</span>
            </p>
          </div>

          <MarqueeSection />
          <TrustRow />
        </div>
      </div>

      <div className="landing-shell landing-main">
        <StatsSection />

        <FeaturesExperience />
        <HowItWorksSection />

        <TestimonialsSection />

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
