import Image from "next/image";
import { PhoneMockup } from "./phone-mockup";

const marqueeWords = ["Study", "Tutor", "Feed", "RAG", "Sphere", "Practice"];

export function MarqueeSection() {
  return (
    <div className="marquee-band" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-set" key={copy}>
            {marqueeWords.map((word) => (
              <span key={`${copy}-${word}`} className="marquee-word">
                {word}
                <span className="marquee-star">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustRow() {
  const subjects = ["Chemistry", "Calculus", "Biology", "History", "Languages", "Physics"];
  return (
    <section className="trust-section">
      <p className="trust-heading">Built for every course you study</p>
      <div className="trust-logos">
        {subjects.map((s) => (
          <span key={s} className="trust-logo">
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

export function FeatureCardsSection() {
  return (
    <section className="feature-cards" id="features" aria-labelledby="features-heading">
      <div className="section-center">
        <span className="pill-badge">✦ All-in-one LearnSphere</span>
        <h2 id="features-heading" className="section-title">
          The finest study companion you can find
        </h2>
      </div>

      <div className="feature-card-grid">
        <article className="feature-card">
          <div className="feature-card-label">
            <span className="feature-card-icon">◈</span>
            Live Tutor
          </div>
          <h3>Talk to a tutor on a real video call</h3>
          <p>
            Voice in, voice out—with a lip-synced avatar. Briefings built from your indexed
            materials so answers stay on syllabus.
          </p>
          <div className="feature-card-visual feature-card-visual--tutor">
            <div className="mini-stat">
              <small>Balance of focus</small>
              <strong>Live</strong>
            </div>
            <div className="mini-stat">
              <small>Grounded</small>
              <strong>PDF p.12</strong>
            </div>
            <div className="mini-stat">
              <small>Session</small>
              <strong>+XP</strong>
            </div>
            <div className="mini-bars" aria-hidden>
              <i style={{ height: "90%" }} />
              <i style={{ height: "72%" }} />
              <i style={{ height: "38%" }} />
              <i style={{ height: "16%" }} />
            </div>
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-card-label feature-card-label--alt">
            <span className="feature-card-icon">◇</span>
            Easy Practice
          </div>
          <h3>Swipeable feed from your own uploads</h3>
          <p>
            Quizzes, flashcards, true/false, fill-in-the-blank, and memes—generated from the
            course materials in your study space.
          </p>
          <div className="feature-card-visual feature-card-visual--cards">
            <div className="fake-card fake-card--a">
              <span>LearnSphere Card</span>
              <strong>Feed · Quiz</strong>
            </div>
            <div className="fake-card fake-card--b">
              <span>Practice</span>
              <strong>Flashcard</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="stats-section" aria-labelledby="stats-heading">
      <div className="stats-phones" aria-hidden>
        <PhoneMockup className="stats-phone stats-phone--back" />
        <PhoneMockup className="stats-phone stats-phone--front" />
      </div>
      <div className="stats-copy">
        <span className="pill-badge">✦ About LearnSphere</span>
        <h2 id="stats-heading" className="section-title">
          Manage materials and goals with our all-in-one app
        </h2>
        <p className="section-lead">
          Create a study space, upload PDFs and videos, then learn with a live tutor, grounded
          chat, and a practice feed—while Sphere keeps your streak alive.
        </p>
      </div>
    </section>
  );
}

const processSteps = [
  {
    n: "1",
    title: "Create a study space",
    detail: "Name a course or exam topic—your private container for everything you learn.",
  },
  {
    n: "2",
    title: "Upload & index",
    detail: "Add PDFs, docs, recordings, or YouTube links. Wait for ingest—then retrieval is ready.",
  },
  {
    n: "3",
    title: "Learn every way",
    detail: "Live call, chat & voice, feed swipes, or study tools—all scoped to that space.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="process-section" id="how-it-works" aria-labelledby="how-heading">
      <div className="section-center">
        <span className="pill-badge">✦ Simplified process</span>
        <h2 id="how-heading" className="section-title">
          Making digital studying easy
        </h2>
      </div>
      <div className="process-media">
        <div className="process-media-inner">
          <PhoneMockup />
        </div>
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
    icon: "🛡",
    title: "Grounded answers, every time",
    detail: "Retrieval pulls from your own PDFs, notes, and transcripts before the tutor replies.",
  },
  {
    icon: "📱",
    title: "Mobile-first study sessions",
    detail: "Live tutor, chat & voice, and the learning feed—designed for phone-sized focus.",
  },
  {
    icon: "⚡",
    title: "Sphere keeps you consistent",
    detail: "Streaks, XP, and daily goals so habits stick without the guilt spiral.",
  },
];

export function ToolsSection() {
  return (
    <section className="tools-section" aria-labelledby="tools-heading">
      <div className="tools-copy">
        <span className="pill-badge">✦ Quality features</span>
        <h2 id="tools-heading" className="section-title">
          Save time and score higher with powerful tools
        </h2>
        <p className="section-lead">
          From video-bound quizzes to lip-synced live tutoring—everything is built to help you
          study from what you already have.
        </p>
        <ul className="tools-list">
          {toolPoints.map((t) => (
            <li key={t.title}>
              <span className="tools-list-icon" aria-hidden>
                {t.icon}
              </span>
              <div>
                <strong>{t.title}</strong>
                <p>{t.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="tools-phones" aria-hidden>
        <PhoneMockup className="tools-phone tools-phone--a" />
        <PhoneMockup className="tools-phone tools-phone--b" />
      </div>
    </section>
  );
}

export function DownloadCtaSection({
  downloadUrl,
  downloadLabel,
}: {
  downloadUrl: string;
  downloadLabel: string;
}) {
  return (
    <section className="download-cta" id="download" aria-labelledby="download-heading">
      <div className="download-cta-panel">
        <div className="download-cta-copy">
          <span className="pill-badge pill-badge--on-blue">✦ News and updates</span>
          <h2 id="download-heading">Get the Android app</h2>
          <p>
            Install the latest APK, sign in, create a study space, and try the live tutor or
            learning feed right away.
          </p>
          <div className="download-cta-actions">
            <a className="btn btn-white" href={downloadUrl}>
              {downloadLabel}
            </a>
            <span className="download-cta-note">Android available · iOS & Web coming soon</span>
          </div>
        </div>
        <div className="download-cta-phones" aria-hidden>
          <PhoneMockup className="download-phone download-phone--a" />
          <PhoneMockup className="download-phone download-phone--b" />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-social">
          <span className="footer-social-btn">X</span>
          <span className="footer-social-btn">in</span>
          <span className="footer-social-btn">◉</span>
        </div>
        <div className="footer-brand">
          <Image src="/learnsphere-icon.png" alt="" width={28} height={28} />
          <span>LearnSphere</span>
        </div>
        <div className="footer-platforms">
          <span>Android</span>
          <span>iOS soon</span>
          <span>Web soon</span>
        </div>
      </div>
      <div className="footer-divider" />
      <div className="footer-contact">
        <div>
          <span className="footer-icon">✉</span>
          <strong>Email</strong>
          <p>hello@learnsphere.app</p>
        </div>
        <div>
          <span className="footer-icon">◈</span>
          <strong>Stack</strong>
          <p>LiveKit · Gemini · Groq · Supabase</p>
        </div>
        <div>
          <span className="footer-icon">⬡</span>
          <strong>Privacy</strong>
          <p>Your spaces. Your materials. RLS-protected.</p>
        </div>
      </div>
      <div className="footer-divider" />
      <p className="footer-copy">© {new Date().getFullYear()} LearnSphere. All rights reserved.</p>
    </footer>
  );
}
