"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <Link className="brand" href="#hero" onClick={closeMenu}>
        <Image src="/learnsphere-icon-sm.webp" alt="" width={32} height={32} priority />
        <span>LearnSphere</span>
      </Link>

      <nav className="nav-links nav-links--desktop" aria-label="Primary">
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

      <div className="header-actions">
        <a className="btn btn-nav-cta" href={downloadUrl}>
          Download
          <span className="btn-nav-cta-arrow" aria-hidden>
            →
          </span>
        </a>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={`nav-menu-icon${menuOpen ? " is-open" : ""}`} aria-hidden />
        </button>
      </div>

      <nav
        id={menuId}
        className={`nav-links nav-links--mobile${menuOpen ? " is-open" : ""}`}
        aria-label="Primary"
        hidden={!menuOpen}
      >
        {sections.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`nav-link${active === item.id ? " is-active" : ""}`}
            onClick={() => {
              setActive(item.id);
              closeMenu();
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
