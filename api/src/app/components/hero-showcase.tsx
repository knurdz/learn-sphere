import { PhoneMockup } from "./phone-mockup";

export function HeroShowcase({ downloadUrl }: { downloadUrl: string }) {
  return (
    <div className="hero-grid">
      <div className="hero-col hero-col--left">
        <h1 className="hero-title">
          More focused study.
          <br />
          Less exam stress.
        </h1>
        <p className="hero-sub">
          Live AI tutor, RAG-grounded chat, and a swipeable learning feed—all scoped to the
          materials you upload.
        </p>
      </div>

      <div className="hero-col hero-col--center">
        <div className="hero-phone-glow" aria-hidden />
        <PhoneMockup className="hero-phone" />
      </div>

      <div className="hero-col hero-col--right">
        <p className="hero-aside">
          A user-friendly study companion with simple tools for live tutoring, practice, and
          progress—built around your private study spaces.
        </p>
        <div className="store-buttons">
          <a className="store-btn" href={downloadUrl}>
            <span className="store-btn-icon" aria-hidden>
              ▶
            </span>
            <span>
              <small>Get it on</small>
              <strong>Google Play</strong>
            </span>
          </a>
          <span className="store-btn store-btn--muted" aria-disabled="true">
            <span className="store-btn-icon" aria-hidden>
              ⌘
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
