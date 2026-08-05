"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Do I need to upload anything before I can use the tutor?",
    a: "No. You can chat, use voice, and swipe the learning feed right away. Uploading a PDF, DOCX, recording, or YouTube link just grounds the tutor's answers in your own material.",
  },
  {
    q: "Is the live video tutor available for every language?",
    a: "The UI and generated content support 24 languages. Live voice-to-voice tutoring depends on speech support for your locale—chat & voice always works as a fallback.",
  },
  {
    q: "What happens to my uploaded files?",
    a: "Files are extracted, chunked, and embedded for retrieval inside your private study space, protected by row-level security. Only you can access your spaces and materials.",
  },
  {
    q: "Can I use LearnSphere on iOS or the web?",
    a: "Android is available today. iOS and Web are coming soon—join the Android beta now and we'll keep you posted.",
  },
  {
    q: "What is Sphere?",
    a: "Sphere is your draggable in-app coach across Feed, Learn, and Library. It nudges onboarding steps, warns before streaks break, and tracks your daily goal and XP.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="faq-intro">
        <span className="pill-badge">✦ Frequently asked questions</span>
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
          return (
            <div key={item.q} className={`faq-item${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-chevron" aria-hidden>
                  {open ? "▴" : "▾"}
                </span>
              </button>
              {open && <p className="faq-answer">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
