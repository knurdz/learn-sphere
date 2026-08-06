import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("youtube-transcript", () => ({
  fetchTranscript: vi.fn(),
}));

vi.mock("@distube/ytdl-core", () => ({
  default: {
    getInfo: vi.fn(),
    chooseFormat: vi.fn(),
  },
}));

vi.mock("@/lib/providers/groq", () => ({
  transcribeFile: vi.fn(),
}));

import ytdl from "@distube/ytdl-core";
import { fetchTranscript as fetchYouTubeTranscript } from "youtube-transcript";
import { transcribeFile } from "@/lib/providers/groq";
import { fetchTranscriptSegments, getYouTubeVideoContext } from "./youtube";

describe("YouTube transcript fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses caption segments when youtube-transcript succeeds", async () => {
    vi.mocked(fetchYouTubeTranscript).mockResolvedValue([
      { text: "Intro", offset: 2, duration: 3 },
    ] as never);

    const segments = await fetchTranscriptSegments("abc123");
    expect(segments).toEqual([{ text: "Intro", startSeconds: 2, endSeconds: 5 }]);
    expect(transcribeFile).not.toHaveBeenCalled();
  });

  it("falls back to audio transcription when captions are unavailable", async () => {
    vi.mocked(fetchYouTubeTranscript).mockRejectedValue(new Error("No captions"));
    vi.mocked(ytdl.getInfo).mockResolvedValue({ formats: [{}] } as never);
    vi.mocked(ytdl.chooseFormat).mockReturnValue({
      url: "https://media.example/audio.webm",
      container: "webm",
    } as never);
    vi.mocked(transcribeFile).mockResolvedValue([
      { text: "Audio transcript", startSeconds: 4, endSeconds: 9 },
    ] as never);

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith("https://www.youtube.com/watch?v=")) {
        return new Response("{}", { status: 500 });
      }
      if (url === "https://media.example/audio.webm") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123");
    expect(segments).toEqual([
      { text: "Audio transcript", startSeconds: 4, endSeconds: 9 },
    ]);
    expect(transcribeFile).toHaveBeenCalledOnce();
  });

  it("returns empty transcript segments when both captions and transcription fail", async () => {
    vi.mocked(fetchYouTubeTranscript).mockRejectedValue(new Error("No captions"));
    vi.mocked(ytdl.getInfo).mockRejectedValue(new Error("Cannot resolve stream"));

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const segments = await fetchTranscriptSegments("abc123");
    expect(segments).toEqual([]);
  });

  it("returns actionable context error when no transcript source is available", async () => {
    vi.mocked(fetchYouTubeTranscript).mockRejectedValue(new Error("No captions"));
    vi.mocked(ytdl.getInfo).mockRejectedValue(new Error("Cannot resolve stream"));

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oembed")) {
        return new Response(
          JSON.stringify({ title: "Sample", author_name: "Creator" }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getYouTubeVideoContext("https://www.youtube.com/watch?v=abc123"),
    ).rejects.toThrow(/captions or audio transcription/i);
  });
});
