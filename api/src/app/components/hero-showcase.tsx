import Image from "next/image";

function FeedFloatCard({
  className,
  name,
  handle,
  body,
  badge,
  badgeTone,
}: {
  className: string;
  name: string;
  handle: string;
  body: string;
  badge: string;
  badgeTone: "success" | "accent" | "warn";
}) {
  return (
    <article className={`feed-float ${className}`}>
      <div className="feed-float-head">
        <div className="feed-float-avatar" aria-hidden />
        <div>
          <p className="feed-float-name">{name}</p>
          <p className="feed-float-handle">{handle}</p>
        </div>
      </div>
      <p className="feed-float-body">{body}</p>
      <div className="feed-float-foot">
        <span className={`feed-badge feed-badge--${badgeTone}`}>{badge}</span>
        <span className="feed-float-votes" aria-hidden>
          ↑ ↓
        </span>
      </div>
    </article>
  );
}

export function HeroShowcase() {
  return (
    <div className="showcase">
      <FeedFloatCard
        className="feed-float--tl"
        name="Maya Chen"
        handle="@mayac"
        body="The tutor cited page 12 of my organic chem PDF—exactly what I needed."
        badge="Grounded"
        badgeTone="success"
      />
      <FeedFloatCard
        className="feed-float--tr"
        name="Jordan Lee"
        handle="@jlee"
        body="Finished a flashcard deck from last week's lecture in one commute."
        badge="Quiz ready"
        badgeTone="accent"
      />
      <FeedFloatCard
        className="feed-float--bl"
        name="Sam Rivera"
        handle="@samr"
        body="Live tutor explained the proof using my uploaded notes, not generic web answers."
        badge="Verified"
        badgeTone="success"
      />
      <FeedFloatCard
        className="feed-float--br"
        name="Aisha Khan"
        handle="@aishak"
        body="Sphere nudged me before my streak broke—small push, big difference."
        badge="7-day streak"
        badgeTone="warn"
      />

      <div className="phone-wrap">
        <div className="phone">
          <div className="phone-island" />
          <div className="phone-screen phone-screen--feed">
            <div className="phone-profile-hero">
              <Image
                src="/landing-hero-profile.png"
                alt=""
                width={240}
                height={280}
                className="phone-profile-photo"
                priority
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
        </div>
      </div>

      <div className="source-badges">
        <div className="source-badge">
          <span className="source-badge-icon">🤖</span>
          Live AI tutor
        </div>
        <div className="source-badge">
          <span className="source-badge-icon">📚</span>
          Your library
        </div>
      </div>
    </div>
  );
}
