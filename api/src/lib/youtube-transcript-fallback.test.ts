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

  it("converts youtube-transcript millisecond offsets to seconds", async () => {
    vi.mocked(fetchYouTubeTranscript).mockResolvedValue([
      { text: "Intro", offset: 2000, duration: 3000 },
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
      hasAudio: true,
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

  it("falls back to progressive hasAudio when audioonly format selection fails", async () => {
    vi.mocked(fetchYouTubeTranscript).mockRejectedValue(new Error("No captions"));
    vi.mocked(ytdl.getInfo).mockResolvedValue({
      formats: [
        {
          itag: 18,
          url: "https://media.example/progressive.mp4",
          mimeType: "video/mp4",
          container: "mp4",
          hasAudio: true,
          hasVideo: true,
          contentLength: "10600000",
        },
      ],
    } as never);
    vi.mocked(ytdl.chooseFormat).mockImplementation((_formats, options) => {
      if (options && "filter" in options && options.filter === "audioonly") {
        throw new Error("No such format found: highestaudio");
      }
      return {
        itag: 18,
        url: "https://media.example/progressive.mp4",
        mimeType: "video/mp4",
        container: "mp4",
        hasAudio: true,
        hasVideo: true,
      } as never;
    });
    vi.mocked(transcribeFile).mockResolvedValue([
      { text: "Progressive transcript", startSeconds: 1, endSeconds: 8 },
    ] as never);

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith("https://www.youtube.com/watch?v=")) {
        return new Response("{}", { status: 500 });
      }
      if (url === "https://media.example/progressive.mp4") {
        return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123");
    expect(segments).toEqual([
      { text: "Progressive transcript", startSeconds: 1, endSeconds: 8 },
    ]);
    expect(transcribeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "audio/mp4",
        fileName: "youtube-abc123.m4a",
      }),
    );
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
