import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
