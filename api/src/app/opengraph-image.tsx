import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LearnSphere: AI study companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#050505",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          />
          LearnSphere
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            An AI tutor that only teaches from your own notes
          </div>
          <div style={{ fontSize: 28, color: "#a1a1b5", maxWidth: 780 }}>
            Live tutoring · grounded chat · practice feed · Android available now
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
