"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

type LandingNavProps = {
  downloadUrl: string;
  downloadNavLabel: string;
};

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#download", label: "Download" },
];

export function LandingNav({ downloadUrl, downloadNavLabel }: LandingNavProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="#hero">
        <Image src="/learnsphere-icon.png" alt="" width={36} height={36} priority />
        <span>LearnSphere</span>
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="site-nav-link">
            {link.label}
          </a>
        ))}
      </nav>

      <div className="site-header-actions">
        <ThemeToggle />
        <a className="btn btn-primary btn-sm" href={downloadUrl}>
          {downloadNavLabel}
        </a>
      </div>
    </header>
  );
}
