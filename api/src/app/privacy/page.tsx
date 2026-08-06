import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How LearnSphere handles your study spaces, materials, and account data.",
};

export default function PrivacyPage() {
  return (
    <div className="landing">
      <div className="landing-glow landing-glow--tl" aria-hidden />
      <div className="landing-glow landing-glow--br" aria-hidden />
      <main className="legal-page">
        <Link className="legal-back" href="/">
          ← Back to LearnSphere
        </Link>
        <h1>Privacy</h1>
        <p>
          LearnSphere is built around private study spaces. This page explains what that means in
          plain language.
        </p>

        <h2>Your study spaces</h2>
        <p>
          Materials you upload—PDFs, documents, recordings, and YouTube links—live inside a study
          space that only you can access. Access is enforced with row-level security in the
          database.
        </p>

        <h2>How materials are used</h2>
        <ul>
          <li>Files are extracted, chunked, and embedded so the tutor can retrieve relevant passages.</li>
          <li>Retrieval grounds chat and live tutoring answers in your own content.</li>
          <li>We do not sell your study materials.</li>
        </ul>

        <h2>Account data</h2>
        <p>
          Sign-in is handled by Supabase Auth. Progress signals like streaks and XP are stored with
          your account so Sphere can coach you across sessions.
        </p>

        <h2>Live sessions</h2>
        <p>
          Live tutor calls run through LiveKit. Session transcripts can be saved back to your study
          space when the worker finishes a call.
        </p>

        <h2>Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:hello@learnsphere.app">hello@learnsphere.app</a>
        </p>
      </main>
    </div>
  );
}
