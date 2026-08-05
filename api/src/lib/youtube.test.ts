import { describe, expect, it } from "vitest";
import { getYouTubeVideoId } from "./youtube";

describe("YouTube URLs", () => {
  it("extracts IDs from common YouTube URL formats", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
    expect(getYouTubeVideoId("https://youtu.be/abc123?t=30")).toBe("abc123");
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/abc123")).toBe("abc123");
  });

  it("rejects non-YouTube URLs", () => {
    expect(getYouTubeVideoId("https://example.com/video/abc123")).toBeNull();
  });
});
