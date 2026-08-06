import Image from "next/image";

export type PhoneVariant = "feed" | "tutor" | "library";

type PhoneMockupProps = {
  className?: string;
  variant?: PhoneVariant;
  /** Prefer true only for the hero phone. */
  priority?: boolean;
};

export function PhoneMockup({
  className = "",
  variant = "feed",
  priority = false,
}: PhoneMockupProps) {
  return (
    <div className={`phone ${className}`.trim()} aria-hidden="true">
      <div className="phone-island" />
      {variant === "tutor" ? (
        <TutorScreen priority={priority} />
      ) : variant === "library" ? (
        <LibraryScreen />
      ) : (
        <FeedScreen priority={priority} />
      )}
    </div>
  );
}

function FeedScreen({ priority }: { priority: boolean }) {
  return (
    <div className="phone-screen phone-screen--feed">
      <div className="phone-profile-hero">
        <Image
          src="/landing-hero-profile.png"
          alt=""
          width={240}
          height={280}
          className="phone-profile-photo"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
        <div className="phone-profile-overlay">
          <p className="phone-profile-greet">Welcome back</p>
          <p className="phone-profile-name">Ready to learn</p>
        </div>
      </div>
      <div className="phone-feed-header">
        <span>Feed</span>
        <span className="phone-feed-space">Organic Chem</span>
      </div>
      <article className="phone-feed-card">
        <p className="phone-feed-q">Mitochondria produce ATP via oxidative phosphorylation.</p>
        <span className="feed-badge feed-badge--success">From your PDF · p. 24</span>
      </article>
      <article className="phone-feed-card">
        <p className="phone-feed-q">Quick quiz: name the rate-limiting step in glycolysis.</p>
        <span className="feed-badge feed-badge--accent">Flashcard</span>
      </article>
      <article className="phone-feed-card phone-feed-card--muted">
        <p className="phone-feed-q">Live tutor recap saved to your study space.</p>
        <span className="feed-badge feed-badge--success">Session complete</span>
      </article>
    </div>
  );
}

function TutorScreen({ priority }: { priority: boolean }) {
  return (
    <div className="phone-screen phone-screen--tutor">
      <div className="phone-tutor-stage">
        <Image
          src="/landing-hero-profile.png"
          alt=""
          width={240}
          height={320}
          className="phone-tutor-photo"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
        <div className="phone-tutor-live">
          <span className="phone-tutor-dot" />
          Live
        </div>
        <div className="phone-tutor-caption-bar">
          <p className="phone-tutor-caption">Explaining glycolysis from your notes</p>
        </div>
      </div>
      <div className="phone-tutor-panel">
        <div className="phone-tutor-chip">Grounded · PDF p.12</div>
        <p className="phone-tutor-line">“Phosphofructokinase-1 is the rate-limiting step.”</p>
        <div className="phone-tutor-controls">
          <span>Mute</span>
          <span className="phone-tutor-end">End</span>
          <span>Chat</span>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen() {
  return (
    <div className="phone-screen phone-screen--library">
      <div className="phone-lib-header">
        <span>Library</span>
        <span className="phone-feed-space">Organic Chem</span>
      </div>
      <ul className="phone-lib-list">
        <li>
          <span className="phone-lib-icon">PDF</span>
          <div>
            <strong>Lecture 4: Glycolysis</strong>
            <small>Indexed · 24 pages</small>
          </div>
        </li>
        <li>
          <span className="phone-lib-icon phone-lib-icon--vid">VID</span>
          <div>
            <strong>Krebs cycle walkthrough</strong>
            <small>YouTube · transcribed</small>
          </div>
        </li>
        <li>
          <span className="phone-lib-icon phone-lib-icon--doc">DOC</span>
          <div>
            <strong>Lab notes: week 3</strong>
            <small>Indexed · 6 pages</small>
          </div>
        </li>
        <li>
          <span className="phone-lib-icon">PDF</span>
          <div>
            <strong>Exam prep checklist</strong>
            <small>Ready for retrieval</small>
          </div>
        </li>
        <li className="phone-lib-list--muted">
          <span className="phone-lib-icon phone-lib-icon--doc">DOC</span>
          <div>
            <strong>Study guide: midterm</strong>
            <small>Indexed · 11 pages</small>
          </div>
        </li>
      </ul>
    </div>
  );
}
