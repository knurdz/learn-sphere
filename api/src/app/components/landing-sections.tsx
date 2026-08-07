import Image from "next/image";
import { PhoneMockup } from "./phone-mockup";

const marqueeWords = ["Study", "Tutor", "Feed", "Notes", "Sphere", "Practice"];

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 2.5 14.5 5v4.2c0 3.3-2.2 5.4-5.5 6.3C5.7 14.6 3.5 12.5 3.5 9.2V5L9 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 9 8.2 10.7 11.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="5" y="2.5" width="8" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 13.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M10 2.5 5.5 10h3.2L8 15.5 12.5 8H9.3L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 1.2 7.1 4.4 10.5 4.6 7.9 6.9 8.7 10.2 6 8.5 3.3 10.2 4.1 6.9 1.5 4.6 4.9 4.4 6 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MarqueeSection() {
  return (
    <div className="marquee-band" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-set" key={copy}>
            {marqueeWords.map((word) => (
              <span key={`${copy}-${word}`} className="marquee-word">
                {word}
                <span className="marquee-star">
                  <IconStar />
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustRow() {
  return (
    <section className="trust-section">
      <p className="trust-heading">Built for every course you study</p>
      <p className="trust-lead">
        Chemistry, calculus, biology, history, languages, physics, and anything else you can put in a
        study space. Answers stay grounded in your uploads, not the open web.
      </p>
    </section>
  );
}

export function FeatureCardsSection() {
  return (
    <section className="feature-cards" id="features" aria-labelledby="features-heading">
      <div className="section-center">
        <span className="pill-badge">
          <IconStar /> Study modes
        </span>
        <h2 id="features-heading" className="section-title">
          Three ways to learn from the same materials
        </h2>
        <p className="section-lead">
          Live tutoring, a practice feed, and grounded chat, all scoped to one private study space.
        </p>
      </div>

      <div className="feature-card-grid feature-card-grid--three">
        <article className="feature-card">
          <div className="feature-card-label">
            <span className="feature-card-icon">◈</span>
            Live Tutor
          </div>
          <h3>Talk to a tutor on a real video call</h3>
          <p>
            Voice in, voice out, with a lip-synced avatar. Briefings built from your indexed materials
            so answers stay on syllabus.
          </p>
          <div className="feature-card-phone">
            <PhoneMockup variant="tutor" />
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-card-label feature-card-label--alt">
            <span className="feature-card-icon">◇</span>
            Practice Feed
          </div>
          <h3>Swipeable feed from your own uploads</h3>
          <p>
            Quizzes, flashcards, true/false, fill-in-the-blank, and memes, generated from the course
            materials in your study space.
          </p>
          <div className="feature-card-phone">
            <PhoneMockup variant="feed" />
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-card-label">
            <span className="feature-card-icon">⬡</span>
            Grounded Library
          </div>
          <h3>Upload once. Retrieve forever.</h3>
          <p>
            PDFs, docs, recordings, and YouTube links are chunked and embedded so chat and the live
            tutor answer from your files, not generic web knowledge.
          </p>
          <div className="feature-card-phone">
            <PhoneMockup variant="library" />
          </div>
        </article>
      </div>
    </section>
  );
}

const processSteps = [
  {
    n: "1",
    title: "Create a study space",
    detail: "Name a course or exam topic. It becomes your private container for everything you learn.",
  },
  {
    n: "2",
    title: "Upload & index",
    detail: "Add PDFs, docs, recordings, or YouTube links. Wait for ingest, then retrieval is ready.",
  },
  {
    n: "3",
    title: "Learn every way",
    detail: "Live call, chat and voice, feed swipes, or study tools, all scoped to that space.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="process-section" id="how-it-works" aria-labelledby="how-heading">
      <div className="section-center">
        <span className="pill-badge">
          <IconStar /> Simplified process
        </span>
        <h2 id="how-heading" className="section-title">
          Making digital studying easy
        </h2>
      </div>
      <div className="process-cards">
        {processSteps.map((step) => (
          <article key={step.n} className="process-card">
            <span className="process-num">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const toolPoints = [
  {
    icon: <IconShield />,
    title: "Grounded answers, every time",
    detail: "Retrieval pulls from your own PDFs, notes, and transcripts before the tutor replies.",
  },
  {
    icon: <IconPhone />,
    title: "Mobile-first study sessions",
    detail: "Live tutor, chat and voice, and the learning feed, designed for phone-sized focus.",
  },
  {
    icon: <IconBolt />,
    title: "Sphere keeps you consistent",
    detail: "Streaks, XP, and daily goals so habits stick without the guilt spiral.",
  },
];

export function ToolsSection() {
  return (
    <section className="tools-section" aria-labelledby="tools-heading">
      <div className="tools-copy">
        <span className="pill-badge">
          <IconStar /> Why it sticks
        </span>
        <h2 id="tools-heading" className="section-title">
          Built to keep you on your own syllabus
        </h2>
        <p className="section-lead">
          From video-bound quizzes to lip-synced live tutoring, everything helps you study from what
          you already have.
        </p>
        <ul className="tools-list">
          {toolPoints.map((t) => (
            <li key={t.title}>
              <span className="tools-list-icon">{t.icon}</span>
              <div>
                <strong>{t.title}</strong>
                <p>{t.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="tools-phones" aria-hidden>
        <PhoneMockup className="tools-phone tools-phone--a" variant="library" />
        <PhoneMockup className="tools-phone tools-phone--b" variant="tutor" />
      </div>
    </section>
  );
}

export function DownloadCtaSection({
  downloadUrl,
  versionLabel,
}: {
  downloadUrl: string;
  versionLabel: string | null;
}) {
  const versionNote = versionLabel ? `v${versionLabel}` : "latest";

  return (
    <section className="download-cta" id="download" aria-labelledby="download-heading">
      <div className="download-cta-panel">
        <div className="download-cta-copy">
          <span className="pill-badge pill-badge--on-blue">
            <IconStar /> Android available
          </span>
          <h2 id="download-heading">Download for Android</h2>
          <p>
            Install the APK, sign in, create a study space, and try the live tutor or learning feed
            right away.
          </p>
          <div className="download-cta-actions">
            <a className="btn btn-white" href={downloadUrl}>
              Download for Android
            </a>
            <span className="download-cta-note">
              Direct APK, {versionNote}. Enable installs from unknown sources. iOS and Web coming
              soon.
            </span>
          </div>
        </div>
        <div className="download-cta-phones" aria-hidden>
          <PhoneMockup className="download-phone download-phone--a" variant="feed" />
          <PhoneMockup className="download-phone download-phone--b" variant="library" />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ downloadUrl }: { downloadUrl: string }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand-block">
          <div className="footer-brand">
            <Image src="/learnsphere-icon-sm.webp" alt="" width={28} height={28} />
            <span>LearnSphere</span>
          </div>
          <p className="footer-tagline">
            An AI tutor grounded in your own notes, built for focused study.
          </p>
        </div>

        <div className="footer-platforms">
          <p className="footer-platforms-label">Get the app</p>
          <div className="footer-platform-row">
            <a className="footer-platform-btn footer-platform-btn--active" href={downloadUrl}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Android
            </a>
            <span className="footer-platform-btn" aria-disabled="true">
              iOS soon
            </span>
            <span className="footer-platform-btn" aria-disabled="true">
              Web soon
            </span>
          </div>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-mid">
        <nav className="footer-link-cols" aria-label="Footer">
          <div className="footer-col">
            <h3 className="footer-col-title">Explore</h3>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#faq">FAQ</a>
            <a href="#download">Download</a>
          </div>
          <div className="footer-col">
            <h3 className="footer-col-title">Legal</h3>
            <a href="/privacy">Privacy</a>
          </div>
        </nav>

        <div className="footer-contact-card">
          <h3 className="footer-col-title">Get in touch</h3>
          <p>Questions or feedback? Send a note and we will get back to you.</p>
          <a className="footer-email" href="mailto:hello@learnsphere.app">
            hello@learnsphere.app
          </a>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-bottom">
        <p className="footer-copy">© {new Date().getFullYear()} LearnSphere. All rights reserved.</p>
        <p className="footer-trust">Your uploads stay in your private study spaces.</p>
      </div>
    </footer>
  );
}
