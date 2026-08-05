export function AppShellSection() {
  return (
    <section className="exp exp-shell" aria-labelledby="shell-heading">
      <div className="exp-intro">
        <p className="exp-kicker">App navigation</p>
        <h2 id="shell-heading" className="exp-title">
          Three tabs. One study space.
        </h2>
        <p className="exp-lead">
          Everything you do scopes to the active study space—Feed, Live tutor, and Library stay in
          sync so the AI never drifts off syllabus.
        </p>
      </div>
      <div className="shell-orbit">
        <div className="shell-hub">
          <span className="shell-hub-label">Active study space</span>
          <strong>Organic Chemistry</strong>
          <span className="shell-hub-meta">12 materials · indexed</span>
        </div>
        <div className="shell-spoke shell-spoke--feed">
          <div className="shell-tab-ui">
            <span className="shell-tab-icon">◇</span>
            <span className="shell-tab-name">Feed</span>
          </div>
          <p>Swipe memes, quizzes, flashcards, true/false, fill-in-the-blank, and “did you know” cards.</p>
        </div>
        <div className="shell-spoke shell-spoke--learn">
          <div className="shell-tab-ui shell-tab-ui--active">
            <span className="shell-tab-icon">◉</span>
            <span className="shell-tab-name">Learn</span>
          </div>
          <p>Live video tutor, chat & voice Q&A, plus study tools—video quizzes, lesson scripts, engage guides.</p>
        </div>
        <div className="shell-spoke shell-spoke--library">
          <div className="shell-tab-ui">
            <span className="shell-tab-icon">▤</span>
            <span className="shell-tab-name">Library</span>
          </div>
          <p>Upload PDF, DOCX, text, audio, or video. Track ingest status and open files with signed URLs.</p>
        </div>
        <svg className="shell-lines" viewBox="0 0 400 400" aria-hidden>
          <path d="M200 200 L200 60 M200 200 L340 280 M200 200 L60 280" />
        </svg>
      </div>
    </section>
  );
}

export function LiveTutorSection() {
  const modes = [
    "Library-grounded tutoring",
    "Teach from your brief",
    "Video engagement coach",
    "YouTube transcript walkthrough",
  ];
  return (
    <section className="exp exp-live" aria-labelledby="live-heading">
      <div className="exp-live-grid">
        <div className="exp-live-copy">
          <p className="exp-kicker exp-kicker--light">Live & tutoring</p>
          <h2 id="live-heading">Talk to a tutor on a real video call</h2>
          <p>
            Voice in, voice out—with turn-taking, interruptions, and a lip-synced avatar in the
            same LiveKit room. Before you join, the app builds a briefing from your indexed
            materials or YouTube link so answers stay tied to your content.
          </p>
          <ul className="exp-checklist">
            <li>Transcript saved when the call ends</li>
            <li>Locale-aware speech-to-text & text-to-speech when your language supports live voice</li>
            <li>
              <strong>Chat & voice</strong> sheet for text Q&A or recorded questions—same RAG path,
              no video worker required
            </li>
          </ul>
          <div className="mode-pills">
            {modes.map((m) => (
              <span key={m} className="mode-pill">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="live-stage" aria-hidden>
          <div className="live-call-frame">
            <div className="live-avatar-ring">
              <div className="live-avatar" />
              <div className="live-wave live-wave--1" />
              <div className="live-wave live-wave--2" />
            </div>
            <p className="live-caption">Beyond Presence avatar · speaking</p>
            <div className="live-user-pip">
              <span>You</span>
              <div className="live-mic-bars">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="live-chat-sheet">
            <span className="live-chat-label">Chat & voice</span>
            <p>“Explain the mechanism on page 12…”</p>
            <span className="citation-chip">PDF · p. 12</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RagSection() {
  return (
    <section className="exp exp-rag" aria-labelledby="rag-heading">
      <div className="exp-intro">
        <p className="exp-kicker">Ingestion & RAG</p>
        <h2 id="rag-heading" className="exp-title">
          ChatGPT doesn&apos;t know your course. LearnSphere does.
        </h2>
        <p className="exp-lead">
          Upload once: we extract PDFs and DOCX, transcribe audio and video, chunk with overlap,
          embed with Gemini, and retrieve via pgvector before every tutor reply and live briefing.
        </p>
      </div>
      <div className="rag-flow">
        <div className="rag-node">
          <div className="rag-node-icon">📄</div>
          <strong>Your files</strong>
          <span>PDF · DOCX · text · A/V</span>
        </div>
        <div className="rag-connector" />
        <div className="rag-node">
          <div className="rag-node-icon">⚙️</div>
          <strong>Extract & chunk</strong>
          <span>Groq transcription for media</span>
        </div>
        <div className="rag-connector" />
        <div className="rag-node rag-node--accent">
          <div className="rag-node-icon">🧠</div>
          <strong>Embeddings</strong>
          <span>Similarity search in Postgres</span>
        </div>
        <div className="rag-connector" />
        <div className="rag-answer">
          <p className="rag-answer-text">
            The rate-limiting step is phosphofructokinase-1…
          </p>
          <div className="rag-citations">
            <span className="citation-chip">Lecture.pdf · p. 24</span>
            <span className="citation-chip">Notes.docx · chunk 3</span>
            <span className="citation-chip citation-chip--time">Video · 12:04</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeedSection() {
  const cards = [
    { type: "Meme", color: "meme", text: "When the exam asks exactly what you swiped yesterday" },
    { type: "Quiz", color: "quiz", text: "Which enzyme catalyzes step 3?" },
    { type: "Flashcard", color: "flash", text: "ATP ↔ ADP + Pi" },
    { type: "True / False", color: "tf", text: "Mitochondria have their own DNA" },
    { type: "Did you know", color: "dyk", text: "Glycolysis happens in the cytosol" },
  ];
  return (
    <section className="exp exp-feed" aria-labelledby="feed-heading">
      <div className="exp-feed-layout">
        <div>
          <p className="exp-kicker">Learning feed</p>
          <h2 id="feed-heading" className="exp-title">
            Turn passive reading into swipeable practice
          </h2>
          <p className="exp-lead exp-lead--left">
            Generate cards from your study space—meme templates composited with your topic,
            structured quizzes, flashcards, and more. Submit attempts, earn XP, and mark progress
            as you go.
          </p>
        </div>
        <div className="feed-deck" aria-hidden>
          {cards.map((c, i) => (
            <article
              key={c.type}
              className={`feed-card feed-card--${c.color}`}
              style={{ ["--i" as string]: i }}
            >
              <span className="feed-card-type">{c.type}</span>
              <p>{c.text}</p>
              <div className="feed-card-actions">
                <span>← swipe →</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StudyToolsSection() {
  return (
    <section className="exp exp-tools" aria-labelledby="tools-heading">
      <div className="tools-panel">
        <div className="tools-copy">
          <p className="exp-kicker">Study tools</p>
          <h2 id="tools-heading" className="exp-title">
            Video-aware tools—not just text summaries
          </h2>
          <p className="exp-lead exp-lead--left">
            Video quizzes bound to timestamps, lesson scripts for “video create,” and engagement
            guides for “video engage.” No local video? We can still work from a YouTube link in
            your space.
          </p>
        </div>
        <div className="video-lab" aria-hidden>
          <div className="video-screen">
            <div className="video-playhead" />
            <span className="video-ts video-ts--a">04:12</span>
            <span className="video-ts video-ts--b">08:47</span>
            <span className="video-ts video-ts--c">14:02</span>
          </div>
          <div className="video-quiz-pop">
            <strong>Quiz @ 8:47</strong>
            <p>What catalyst is introduced here?</p>
            <div className="video-quiz-opts">
              <span>A</span>
              <span className="is-correct">B</span>
              <span>C</span>
            </div>
          </div>
          <div className="tool-tags">
            <span>Lesson script</span>
            <span>Engage guide</span>
            <span>YouTube source</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SphereSection() {
  return (
    <section className="exp exp-sphere" aria-labelledby="sphere-heading">
      <div className="sphere-layout">
        <div className="sphere-visual" aria-hidden>
          <div className="sphere-mascot">
            <div className="sphere-body">◎</div>
            <div className="sphere-bubble">
              Streak at risk—one quiz keeps your 7 days alive!
            </div>
          </div>
          <div className="sphere-stats">
            <div className="sphere-ring">
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" className="ring-bg" />
                <circle cx="40" cy="40" r="34" className="ring-fill" />
              </svg>
              <span>85%</span>
              <small>Daily goal</small>
            </div>
            <div className="sphere-xp">
              <span className="sphere-xp-label">XP today</span>
              <strong>+240</strong>
              <ul>
                <li>Feed attempt</li>
                <li>Live session</li>
                <li>Upload indexed</li>
              </ul>
            </div>
          </div>
          <div className="tour-rail">
            <span className="tour-dot is-done" />
            <span className="tour-dot is-done" />
            <span className="tour-dot is-current" />
            <span className="tour-dot" />
            <span className="tour-label">Guided tour · Library step</span>
          </div>
        </div>
        <div>
          <p className="exp-kicker">Sphere coach & progress</p>
          <h2 id="sphere-heading" className="exp-title">
            Habits that stick, not guilt that fades
          </h2>
          <p className="exp-lead exp-lead--left">
            Sphere is a draggable coach on Feed, Learn, and Library—onboarding nudges, streak
            warnings, and daily goal reminders. Progress shows streak hero, activity charts
            (day / week / month), and XP breakdown by real study actions.
          </p>
        </div>
      </div>
    </section>
  );
}

export function PersonalizationSection() {
  return (
    <section className="exp exp-l10n" aria-labelledby="l10n-heading">
      <div className="l10n-grid">
        <div>
          <p className="exp-kicker">Personalization</p>
          <h2 id="l10n-heading" className="exp-title">
            Your language. Your theme. Your accent.
          </h2>
          <p className="exp-lead exp-lead--left">
            24 UI languages—generated feed cards and tutors follow your locale header. Pick
            system / light / dark theme and accent color. Profile avatars from upload, DiceBear,
            or Google photo.
          </p>
          <p className="exp-note">
            Sign in with email, Google, or email OTP verification. Private study spaces protected
            by Supabase row-level security.
          </p>
        </div>
        <div className="l10n-visual" aria-hidden>
          <div className="lang-cloud">
            {["English", "Español", "Français", "Deutsch", "日本語", "한국어", "සිංහල", "हिन्दी", "العربية", "Português"].map(
              (lang) => (
                <span key={lang} className="lang-chip">
                  {lang}
                </span>
              ),
            )}
            <span className="lang-chip lang-chip--more">+14 more</span>
          </div>
          <div className="theme-strip">
            <span className="theme-swatch theme-swatch--system">System</span>
            <span className="theme-swatch theme-swatch--light is-active">Light</span>
            <span className="theme-swatch theme-swatch--dark">Dark</span>
          </div>
          <div className="accent-row">
            <i className="accent-dot" style={{ background: "#6b5ae0" }} />
            <i className="accent-dot" style={{ background: "#00b8f5" }} />
            <i className="accent-dot" style={{ background: "#22c55e" }} />
            <i className="accent-dot" style={{ background: "#f97316" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      title: "Create a study space",
      detail: "Name a course or exam topic—your private container for everything you learn.",
    },
    {
      title: "Upload & index",
      detail: "Add PDFs, docs, recordings, or links. Wait for ingest—then retrieval is ready.",
    },
    {
      title: "Learn every way",
      detail: "Live call, chat & voice, feed swipes, or study tools—all scoped to that space.",
    },
  ];
  return (
    <section className="exp exp-journey" id="how-it-works" aria-labelledby="how-heading">
      <h2 id="how-heading" className="exp-title exp-title--center">
        Onboarding in three moves
      </h2>
      <p className="exp-lead exp-lead--center">
        Sphere and the app share the same path: space → material → ready for feed and tutor.
      </p>
      <div className="journey-path">
        {steps.map((step, i) => (
          <article key={step.title} className="journey-step">
            <div className="journey-marker">{i + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FeaturesExperience() {
  return (
    <div id="features" className="features-experience">
      <AppShellSection />
      <LiveTutorSection />
      <RagSection />
      <FeedSection />
      <StudyToolsSection />
      <SphereSection />
      <PersonalizationSection />
    </div>
  );
}
