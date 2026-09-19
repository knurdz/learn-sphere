import {
  PLAY_TESTERS_GROUP_URL,
  PLAY_TESTING_URL,
} from "@/lib/play-testing";
import { GooglePlayBadge } from "./google-play-badge";
import { PhoneMockup } from "./phone-mockup";

type HeroShowcaseProps = {
  downloadUrl: string;
  versionLabel: string | null;
};

export function HeroShowcase({ downloadUrl, versionLabel }: HeroShowcaseProps) {
  const versionNote = versionLabel ? `v${versionLabel}` : "latest";

  return (
    <div className="hero-grid">
      <div className="hero-col hero-col--left">
        <h1 className="hero-title">An AI tutor that only teaches from your own notes</h1>
        <p className="hero-sub">
          Live video tutoring, RAG-grounded chat, and a swipeable practice feed, all scoped to the
          PDFs, docs, and videos you upload.
        </p>
        <div className="hero-cta-block">
          <GooglePlayBadge />
          <p className="hero-cta-note">
            Join the{" "}
            <a href={PLAY_TESTERS_GROUP_URL} target="_blank" rel="noopener noreferrer">
              testers group
            </a>{" "}
            with the same Gmail as your Play Store account, then install from{" "}
            <a href={PLAY_TESTING_URL} target="_blank" rel="noopener noreferrer">
              Google Play
            </a>
            .
          </p>
        </div>
      </div>

      <div className="hero-col hero-col--center">
        <div className="hero-phone-glow" aria-hidden />
        <PhoneMockup className="hero-phone" variant="feed" priority />
      </div>

      <div className="hero-col hero-col--right">
        <p className="hero-aside">
          Built around private study spaces with simple tools for live tutoring, practice, and
          progress, without leaving your materials behind.
        </p>
        <div className="store-buttons">
          <a className="store-btn" href={PLAY_TESTING_URL} target="_blank" rel="noopener noreferrer">
            <span className="store-btn-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3.5 2.5 8.5 8 3.5 13.5V2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 8 12.5 5.5 3.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 8 12.5 10.5 3.5 13.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M12.5 5.5 8.5 8 12.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              <small>Google Play</small>
              <strong>Closed testing</strong>
            </span>
          </a>
          <a className="store-btn store-btn--secondary" href={downloadUrl}>
            <span className="store-btn-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              <small>Android APK, {versionNote}</small>
              <strong>Sideload APK</strong>
            </span>
          </a>
          <span className="store-btn store-btn--muted" aria-disabled="true">
            <span className="store-btn-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8.5 2.5C6.5 2.5 5.5 4 5.5 5.5c0 2 1.5 3 2.5 4.5 1-1.5 2.5-2.5 2.5-4.5 0-1.5-1-3-2.5-3Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M4 13c1.5-1.5 2.5-2 4-2s2.5.5 4 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>
              <small>Coming soon</small>
              <strong>App Store</strong>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
