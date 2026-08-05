"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type LandingNavProps = {
  downloadUrl: string;
};

const sections = [
  { id: "hero", href: "#hero", label: "Home" },
  { id: "features", href: "#features", label: "Features" },
  { id: "how-it-works", href: "#how-it-works", label: "How it works" },
  { id: "faq", href: "#faq", label: "FAQ" },
  { id: "download", href: "#download", label: "Download" },
];

export function LandingNav({ downloadUrl }: LandingNavProps) {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="site-header">
      <Link className="brand" href="#hero">
        <Image src="/learnsphere-icon.png" alt="" width={32} height={32} priority />
        <span>LearnSphere</span>
      </Link>

      <nav className="nav-links" aria-label="Primary">
        {sections.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`nav-link${active === item.id ? " is-active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="btn btn-nav-cta" href={downloadUrl}>
        Get Started Now
        <span className="btn-nav-cta-arrow" aria-hidden>
          →
        </span>
      </a>
    </header>
  );
}
