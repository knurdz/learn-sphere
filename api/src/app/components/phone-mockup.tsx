import Image from "next/image";

type PhoneMockupProps = {
  className?: string;
};

export function PhoneMockup({ className = "" }: PhoneMockupProps) {
  return (
    <div className={`phone ${className}`.trim()}>
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
  );
}
