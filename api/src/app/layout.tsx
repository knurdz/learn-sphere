import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeScript } from "./components/theme-script";
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
  icons: {
    icon: "/learnsphere-icon.png",
    apple: "/learnsphere-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
