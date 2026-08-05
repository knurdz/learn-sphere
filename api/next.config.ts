import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
