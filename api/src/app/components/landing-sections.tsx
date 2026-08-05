import Image from "next/image";
import { PhoneMockup } from "./phone-mockup";

const marqueeWords = ["Feed", "Live Tutor", "RAG", "Sphere", "Study Tools", "Study Spaces"];

export function MarqueeSection() {
  return (
    <div className="marquee-band" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-set" key={copy}>
            {marqueeWords.map((word) => (
              <span key={`${copy}-${word}`} className="marquee-word">
                {word}
                <span className="marquee-dot">✳</span>
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
    <div className="trust-row">
      <p className="trust-row-label">Built for every course, in 24 languages</p>
      <div className="trust-row-pills">
        {subjects.map((s) => (
          <span key={s} className="trust-pill">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

const stats = [
  { value: "24+", label: "UI languages supported" },
  { value: "99%", label: "Answers grounded in your files" },
  { value: "3", label: "Ways to learn every space" },
];

export function StatsSection() {
  return (
    <section className="stats-section" aria-labelledby="stats-heading">
      <div className="stats-visual" aria-hidden>
        <PhoneMockup className="stats-phone stats-phone--back" />
        <PhoneMockup className="stats-phone stats-phone--front" />
      </div>
      <div className="stats-copy">
        <p className="exp-kicker exp-kicker--light">About LearnSphere</p>
        <h2 id="stats-heading" className="exp-title">
          Manage every study space with one AI companion.
        </h2>
        <p className="exp-lead exp-lead--left">
          One app for the live tutor, the grounded chat, the swipeable feed, and Sphere—your
          progress coach. Everything stays scoped to the study space you&apos;re in.
        </p>
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote:
      "The live tutor cited page 12 of my organic chem PDF—exactly what I needed before my exam.",
    name: "Maya Chen",
    role: "Pre-med student",
  },
  {
    quote:
      "Sphere nudged me before my streak broke. Small push, but it kept me consistent all semester.",
    name: "Jordan Lee",
    role: "CS undergrad",
  },
  {
    quote:
      "I turned a whole lecture recording into a flashcard deck during my commute. Genuinely useful.",
    name: "Aisha Khan",
    role: "Biology major",
  },
];

export function TestimonialsSection() {
  return (
    <section className="testimonials" aria-labelledby="testimonials-heading">
      <div className="exp-intro">
        <p className="exp-kicker">Loved by learners</p>
        <h2 id="testimonials-heading" className="exp-title">
          What they&apos;re thinking about their study space
        </h2>
      </div>
      <div className="testimonial-grid">
        {testimonials.map((t) => (
          <article key={t.name} className="testimonial-card">
            <span className="testimonial-quote-mark" aria-hidden>
              &ldquo;
            </span>
            <p className="testimonial-body">{t.quote}</p>
            <div className="testimonial-foot">
              <div className="testimonial-avatar" aria-hidden />
              <div>
                <p className="testimonial-name">{t.name}</p>
                <p className="testimonial-role">{t.role}</p>
              </div>
            </div>
          </article>
        ))}
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
          <p className="exp-kicker exp-kicker--light">Get the app</p>
          <h2 id="download-heading">Start studying smarter today</h2>
          <p>
            Install the latest APK, sign in, create a study space, and try the live tutor, chat &
            voice, or the learning feed right away.
          </p>
          <div className="download-platforms">
            <span className="platform-tag platform-tag--live">Android</span>
            <span className="platform-tag">iOS · Coming soon</span>
            <span className="platform-tag">Web · Coming soon</span>
          </div>
          <a className="btn btn-hero-cta btn-hero-cta--light" href={downloadUrl}>
            {downloadLabel}
          </a>
        </div>
        <div className="download-cta-visual" aria-hidden>
          <PhoneMockup className="download-cta-phone" />
        </div>
      </div>
    </section>
  );
}

const socialLinks = [
  { label: "X", href: "https://x.com" },
  { label: "in", href: "https://linkedin.com" },
  { label: "◐", href: "https://instagram.com" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer-new">
      <div className="footer-top">
        <div className="footer-social">
          {socialLinks.map((s) => (
            <a key={s.label} href={s.href} className="footer-social-icon" aria-label={s.label}>
              {s.label}
            </a>
          ))}
        </div>
        <div className="footer-brand">
          <Image src="/learnsphere-icon.png" alt="" width={28} height={28} />
          <span>LearnSphere</span>
        </div>
        <div className="footer-social footer-social--right" aria-hidden />
      </div>
      <div className="footer-divider" />
      <div className="footer-contact">
        <div>
          <span className="footer-contact-icon" aria-hidden>
            ✉
          </span>
          <p>Email us</p>
          <p className="footer-contact-detail">hello@learnsphere.app</p>
        </div>
        <div>
          <span className="footer-contact-icon" aria-hidden>
            ⬢
          </span>
          <p>Platforms</p>
          <p className="footer-contact-detail">Android now · iOS & Web soon</p>
        </div>
        <div>
          <span className="footer-contact-icon" aria-hidden>
            ◈
          </span>
          <p>Built with</p>
          <p className="footer-contact-detail">LiveKit · Gemini · Groq · Supabase</p>
        </div>
      </div>
      <div className="footer-divider" />
      <p className="footer-copyright">© {new Date().getFullYear()} LearnSphere. All rights reserved.</p>
    </footer>
  );
}
