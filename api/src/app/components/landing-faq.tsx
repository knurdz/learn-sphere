"use client";

import { useId, useState } from "react";

const faqs = [
  {
    q: "Do I need to upload anything before I can use the tutor?",
    a: "No. You can chat, use voice, and swipe the learning feed right away. Uploading a PDF, DOCX, recording, or YouTube link just grounds the tutor's answers in your own material.",
  },
  {
    q: "Is the live video tutor available for every language?",
    a: "The UI and generated content support 24 languages. Live voice-to-voice tutoring depends on speech support for your locale. Chat and voice always work as a fallback.",
  },
  {
    q: "What happens to my uploaded files?",
    a: "Files are extracted, chunked, and embedded for retrieval inside your private study space, protected by row-level security. Only you can access your spaces and materials.",
  },
  {
    q: "Can I use LearnSphere on iOS or the web?",
    a: "Android is available today via a direct APK download. iOS and Web are coming soon.",
  },
  {
    q: "What is Sphere?",
    a: "Sphere is your draggable in-app coach across Feed, Learn, and Library. It nudges onboarding steps, warns before streaks break, and tracks your daily goal and XP.",
  },
  {
    q: "How do I install the Android APK?",
    a: "Download the APK from this site, open it on your phone, and allow installs from unknown sources when Android asks. Then sign in and create a study space.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="faq-intro">
        <span className="pill-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M6 1.2 7.1 4.4 10.5 4.6 7.9 6.9 8.7 10.2 6 8.5 3.3 10.2 4.1 6.9 1.5 4.6 4.9 4.4 6 1.2Z"
              fill="currentColor"
            />
          </svg>
          Frequently asked questions
        </span>
        <h2 id="faq-heading" className="section-title">
          Your study queries, solved instantly
        </h2>
        <p className="section-lead">
          Everything you need to know about study spaces, the live tutor, and how your materials
          stay private.
        </p>
      </div>
      <div className="faq-list">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;
          return (
            <div key={item.q} className={`faq-item${open ? " is-open" : ""}`}>
              <button
                type="button"
                id={buttonId}
                className="faq-question"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
              >
                <span>{item.q}</span>
                <span className={`faq-chevron${open ? " is-open" : ""}`} aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 5.5 7 9.5 11 5.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="faq-panel"
                hidden={!open}
              >
                <p className="faq-answer">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
