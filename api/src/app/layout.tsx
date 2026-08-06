import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LearnSphere — Your AI study companion",
    template: "%s · LearnSphere",
  },
  description:
    "Talk to a live AI tutor, organize your course materials, and learn with quizzes and flashcards grounded in what you upload.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "LearnSphere — Your AI study companion",
    description:
      "Voice-first tutoring grounded in your PDFs, notes, and videos. Android available now.",
    type: "website",
    siteName: "LearnSphere",
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnSphere — Your AI study companion",
    description:
      "Voice-first tutoring grounded in your PDFs, notes, and videos. Android available now.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
