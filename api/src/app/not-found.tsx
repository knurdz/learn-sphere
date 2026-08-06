import Link from "next/link";
import { ANDROID_DOWNLOAD_PATH } from "@/lib/github-release";

export default function NotFound() {
  return (
    <div className="landing">
      <div className="landing-glow landing-glow--tl" aria-hidden />
      <div className="landing-glow landing-glow--br" aria-hidden />
      <main className="not-found-page">
        <h1>Page not found</h1>
        <p>That link does not exist. Head home or grab the Android APK.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <a className="btn btn-nav-cta" href={ANDROID_DOWNLOAD_PATH}>
            Download for Android
          </a>
        </div>
      </main>
    </div>
  );
}
