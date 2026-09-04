import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { transcribeFile } from "@/lib/providers/groq";
import {
  fetchTranscriptSegments,
  getYouTubeVideoContext,
  getYouTubeVideoSource,
  YouTubeCaptionsMissingError,
} from "./youtube";

function playerResponse(options: {
  status?: string;
  reason?: string;
  tracks?: Array<{
    baseUrl?: string;
    languageCode?: string;
    kind?: string;
  }>;
  formats?: Array<Record<string, unknown>>;
  title?: string;
  author?: string;
}) {
  return {
    playabilityStatus: {
      status: options.status ?? "OK",
      reason: options.reason,
    },
    videoDetails: {
      title: options.title ?? "Sample",
      author: options.author ?? "Creator",
      lengthSeconds: "120",
      isLiveContent: false,
    },
    captions: options.tracks
      ? {
          playerCaptionsTracklistRenderer: {
            captionTracks: options.tracks,
          },
        }
      : undefined,
    streamingData: {
      adaptiveFormats: options.formats ?? [],
      formats: [],
    },
  };
}

describe("YouTube transcript fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ytdl.getInfo).mockReset();
    vi.mocked(ytdl.chooseFormat).mockReset();
    vi.mocked(transcribeFile).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads timed InnerTube captions including auto-generated tracks", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify(
            playerResponse({
              tracks: [
                {
                  baseUrl: "https://www.youtube.com/api/timedtext?v=abc123",
                  languageCode: "en",
                  kind: "asr",
                },
              ],
            }),
          ),
          { status: 200 },
        );
      }
      if (url.startsWith("https://www.youtube.com/api/timedtext")) {
        expect(url).toContain("fmt=json3");
        return new Response(
          JSON.stringify({
            events: [
              {
                tStartMs: 2000,
                dDurationMs: 3000,
                segs: [{ utf8: "Intro" }],
              },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123XYZ01");
    expect(segments).toEqual([{ text: "Intro", startSeconds: 2, endSeconds: 5 }]);
    expect(transcribeFile).not.toHaveBeenCalled();
  });

  it("prefers the app locale caption track when available", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(
          JSON.stringify(
            playerResponse({
              tracks: [
                {
                  baseUrl: "https://www.youtube.com/api/timedtext?lang=en",
                  languageCode: "en",
                },
                {
                  baseUrl: "https://www.youtube.com/api/timedtext?lang=ta",
                  languageCode: "ta",
                },
              ],
            }),
          ),
          { status: 200 },
        );
      }
      if (url.includes("lang=ta")) {
        return new Response(
          JSON.stringify({
            events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "வணக்கம்" }] }],
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123XYZ01", {
      preferredLanguage: "ta",
    });
    expect(segments[0]?.text).toBe("வணக்கம்");
  });

  it("does not transcribe audio unless allowAudioTranscription is true", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(JSON.stringify(playerResponse({})), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123XYZ01");
    expect(segments).toEqual([]);
    expect(transcribeFile).not.toHaveBeenCalled();
    expect(ytdl.getInfo).not.toHaveBeenCalled();
  });

  it("falls back to audio transcription when captions are unavailable and allowed", async () => {
    vi.mocked(ytdl.getInfo).mockResolvedValue({ formats: [{}] } as never);
    vi.mocked(ytdl.chooseFormat).mockReturnValue({
      url: "https://media.example/audio.webm",
      container: "webm",
      hasAudio: true,
      contentLength: "1000",
    } as never);
    vi.mocked(transcribeFile).mockResolvedValue([
      { text: "Audio transcript", startSeconds: 4, endSeconds: 9 },
    ] as never);

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(JSON.stringify(playerResponse({})), { status: 200 });
      }
      if (url === "https://media.example/audio.webm") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123XYZ01", {
      allowAudioTranscription: true,
    });
    expect(segments).toEqual([
      { text: "Audio transcript", startSeconds: 4, endSeconds: 9 },
    ]);
    expect(transcribeFile).toHaveBeenCalledOnce();
  });

  it("uses InnerTube streaming audio before ytdl when allowed", async () => {
    vi.mocked(transcribeFile).mockResolvedValue([
      { text: "InnerTube audio", startSeconds: 1, endSeconds: 3 },
    ] as never);

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(
          JSON.stringify(
            playerResponse({
              formats: [
                {
                  url: "https://media.example/innertube-audio.m4a",
                  mimeType: "audio/mp4",
                  audioQuality: "AUDIO_QUALITY_MEDIUM",
                  contentLength: "2048",
                },
              ],
            }),
          ),
          { status: 200 },
        );
      }
      if (url === "https://media.example/innertube-audio.m4a") {
        return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchTranscriptSegments("abc123XYZ01", {
      allowAudioTranscription: true,
    });
    expect(segments[0]?.text).toBe("InnerTube audio");
    expect(ytdl.getInfo).not.toHaveBeenCalled();
    expect(transcribeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "audio/mp4",
        fileName: "youtube-abc123XYZ01.m4a",
      }),
    );
  });

  it("throws captions-missing when study tools disallow audio transcription", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(JSON.stringify(playerResponse({})), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getYouTubeVideoSource("https://www.youtube.com/watch?v=abc123XYZ01")).rejects.toBeInstanceOf(
      YouTubeCaptionsMissingError,
    );
  });

  it("returns actionable context error when live tutor audio also fails", async () => {
    vi.mocked(ytdl.getInfo).mockRejectedValue(new Error("Cannot resolve stream"));

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(JSON.stringify(playerResponse({})), { status: 200 });
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getYouTubeVideoContext("https://www.youtube.com/watch?v=abc123XYZ01"),
    ).rejects.toThrow(/captions or audio transcription/i);
  });

  it("surfaces age-restricted playability errors", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/youtubei/v1/player")) {
        return new Response(
          JSON.stringify(
            playerResponse({
              status: "LOGIN_REQUIRED",
              reason: "Sign in to confirm your age",
            }),
          ),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTranscriptSegments("abc123XYZ01")).rejects.toThrow(/sign-in/i);
  });
});
