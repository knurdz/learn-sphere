import type { Metadata } from "next";
import { LandingNav } from "./components/landing-nav";
import { resolveAndroidDownloadUrl } from "@/lib/github-release";

export const metadata: Metadata = {
  title: "LearnSphere — Your AI study companion",
  description:
    "Talk to a live AI tutor on video, keep your course materials in one place, and learn with quizzes, flashcards, and a personalized feed.",
  openGraph: {
    title: "LearnSphere — Your AI study companion",
    description:
      "Voice-first tutoring grounded in your PDFs, notes, and videos. Android available now.",
    type: "website",
  },
};

const features = [
  {
    title: "Live AI tutor",
    description:
      "Speak on a video call with a lip-synced avatar. Real-time voice tutoring grounded in your uploads.",
  },
  {
    title: "Your library",
    description:
      "PDFs, docs, audio, and video in study spaces—with answers that cite pages and timestamps.",
  },
  {
    title: "Learning feed",
    description:
      "Swipe quizzes, flashcards, and quick cards generated from what you are actually studying.",
  },
  {
    title: "Study tools",
    description:
      "Video quizzes, lesson scripts, and engagement guides—including YouTube walkthroughs.",
  },
  {
    title: "Sphere coach",
    description: "Streaks, daily goals, and XP with a friendly in-app coach on every main tab.",
  },
  {
    title: "24 languages",
    description: "Use LearnSphere in your language, with live voice support where available.",
  },
];

const steps = [
  {
    title: "Create a study space",
    description: "Group materials for a class, exam, or topic in your private library.",
  },
  {
    title: "Add your sources",
    description: "Upload files or link content. We index it so tutoring stays on syllabus.",
  },
  {
    title: "Learn your way",
    description: "Live tutor call, chat by voice or text, or scroll the feed and study tools.",
  },
];

function androidDownloadLabel(versionLabel: string | null, short = false): string {
  if (!versionLabel) {
    return short ? "Get Android" : "Download Android APK";
  }
  return short ? `Get ${versionLabel}` : `Download Android (${versionLabel})`;
}

export default async function Home() {
  const androidDownload = await resolveAndroidDownloadUrl();
  const downloadUrl = androidDownload.url;
  const downloadLabel = androidDownloadLabel(androidDownload.versionLabel);
  const navLabel = androidDownloadLabel(androidDownload.versionLabel, true);

  return (
    <div className="landing">
      <div className="landing-inner">
        <LandingNav downloadUrl={downloadUrl} downloadNavLabel={navLabel} />

        <section className="hero" id="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">Study with an AI tutor that knows your course</h1>
          <p className="hero-lead">
            Talk on video, keep every lecture in one place, and turn your materials into quizzes
            you can use today.
          </p>
          <div className="hero-cta-row">
            <a className="btn btn-primary" href={downloadUrl}>
              {downloadLabel}
            </a>
            <a className="btn btn-ghost" href="#features">
              Explore features
            </a>
          </div>
          <div className="platform-row" aria-label="Available platforms">
            <span className="platform-pill is-live">Android · Available now</span>
            <span className="platform-pill">
              iOS <span className="soon">Coming soon</span>
            </span>
            <span className="platform-pill">
              Web <span className="soon">Coming soon</span>
            </span>
          </div>

          <div className="showcase" aria-hidden>
            <div className="float-card float-card--library">
              <strong>Organic Chemistry</strong>
              <span>12 materials indexed</span>
            </div>
            <div className="float-card float-card--streak">
              <strong>7-day streak</strong>
              <span>Daily goal: 85%</span>
            </div>
            <div className="float-card float-card--session">
              <strong>Live tutor session</strong>
              <span>Grounded in your PDFs</span>
              <div className="status-badge">Connected</div>
            </div>
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="phone-app-bar">
                  <span>9:41</span>
                  <span>LearnSphere</span>
                </div>
                <p className="phone-title">Live tutor</p>
                <p className="phone-sub">Your materials · Voice & video</p>
                <div className="phone-card">
                  <div className="phone-card-label">Up next</div>
                  <p>Chapter 4 — Reaction mechanisms</p>
                </div>
                <div className="phone-card">
                  <div className="phone-card-label">Feed</div>
                  <p>3 new flashcards ready</p>
                </div>
                <div className="phone-tabs">
                  <span className="phone-tab is-muted">Feed</span>
                  <span className="phone-tab">Learn</span>
                  <span className="phone-tab is-muted">Library</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features" aria-labelledby="features-heading">
          <div className="section-header">
            <h2 id="features-heading">Everything in one app</h2>
            <p>
              Feed, live tutor, and library share the same study space—so every session builds on
              your materials.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <article key={f.title} className="feature-card">
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-heading">
          <div className="section-header">
            <h2 id="how-heading">How it works</h2>
            <p>From scattered files to a tutor that teaches your content—in three steps.</p>
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <article key={s.title} className="step">
                <span className="step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="download" aria-labelledby="download-heading">
          <div className="download-panel">
            <h2 id="download-heading">Get LearnSphere on Android</h2>
            <p>
              Install the latest APK, sign in with email or Google, and start your first study
              space in minutes. iOS and web apps are on the way.
            </p>
            <div className="platform-row">
              <span className="platform-pill is-live">Android · Available now</span>
              <span className="platform-pill">
                iOS <span className="soon">Coming soon</span>
              </span>
              <span className="platform-pill">
                Web <span className="soon">Coming soon</span>
              </span>
            </div>
            <div className="download-actions">
              <a className="btn btn-primary" href={downloadUrl}>
                {downloadLabel}
              </a>
              <button type="button" className="btn btn-ghost is-disabled" disabled>
                iOS · Coming soon
              </button>
              <button type="button" className="btn btn-ghost is-disabled" disabled>
                Web · Coming soon
              </button>
            </div>
            <p className="download-note">
              To install the APK, allow installs from your browser or file manager, then open the
              downloaded file. The download link always points to the latest published release.
            </p>
          </div>
        </section>

        <footer className="site-footer">
          <p>
            <strong>LearnSphere</strong> — study smarter with AI that reads your materials.
          </p>
          <p>© {new Date().getFullYear()} LearnSphere</p>
        </footer>
      </div>
    </div>
  );
}
