import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LearnSphere API",
  description: "Bridge API for the LearnSphere mobile client.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
