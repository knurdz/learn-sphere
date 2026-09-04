import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/gemini-embeddings", () => ({
  embedTextsInBatches: vi.fn(),
}));

vi.mock("@/lib/youtube", () => ({
  getYouTubeVideoId: vi.fn((value: string) => {
    const match = value.match(/[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})/);
    return match?.[1] || match?.[2] || null;
  }),
  getYouTubeVideoSource: vi.fn(),
  youtubeMaterialFileName: (videoId: string) => `youtube-${videoId}.txt`,
}));

import { embedTextsInBatches } from "@/lib/providers/gemini-embeddings";
import { getYouTubeVideoSource } from "@/lib/youtube";
import {
  ensureYouTubeStudySource,
  mergeTimedCaptionSegments,
  youtubeStoragePathMarker,
} from "./youtube-study-source";
import { youtubeMaterialFileName } from "./youtube";

describe("YouTube study source helpers", () => {
  it("uses a stable storage path marker per video id", () => {
    expect(youtubeMaterialFileName("abc123XYZ01")).toBe("youtube-abc123XYZ01.txt");
    expect(youtubeStoragePathMarker("abc123XYZ01")).toBe("youtube-abc123XYZ01.txt");
  });

  it("packs short caption lines into fewer segments with correct timestamps", () => {
    const segments = [
      { text: "Hello", pageNumber: null, startSeconds: 0, endSeconds: 1 },
      { text: "world", pageNumber: null, startSeconds: 1, endSeconds: 2 },
      { text: "again", pageNumber: null, startSeconds: 2, endSeconds: 3 },
    ];

    const merged = mergeTimedCaptionSegments(segments, 20);
    expect(merged.length).toBeLessThan(segments.length);
    expect(merged[0]?.startSeconds).toBe(0);
    expect(merged[0]?.text).toContain("Hello");
    expect(merged.at(-1)?.endSeconds).toBe(3);

    const oneBig = mergeTimedCaptionSegments(segments, 1400);
    expect(oneBig).toHaveLength(1);
    expect(oneBig[0]).toEqual({
      text: "Hello world again",
      pageNumber: null,
      startSeconds: 0,
      endSeconds: 3,
    });
  });
});

describe("ensureYouTubeStudySource reuse", () => {
  const userId = "22222222-2222-4222-8222-222222222222";
  const studySpaceId = "33333333-3333-4333-8333-333333333333";
  const materialId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call embedTexts when chunks already exist", async () => {
    const materialsBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "ilike", "limit"]) {
      materialsBuilder[method] = vi.fn(() => materialsBuilder);
    }
    materialsBuilder.maybeSingle = vi.fn(async () => ({
      data: {
        id: materialId,
        name: "Cached video",
        storage_path: `user/${userId}/${materialId}/youtube-dQw4w9WgXcQ.txt`,
        status: "ready",
      },
      error: null,
    }));

    const chunksCountTerminal = vi.fn(async () => ({ count: 3, error: null }));
    const chunksBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(() => chunksBuilder),
      eq: vi.fn(() => ({
        eq: chunksCountTerminal,
      })),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "materials") return materialsBuilder;
        if (table === "material_chunks") return chunksBuilder;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await ensureYouTubeStudySource(
      supabase as never,
      userId,
      studySpaceId,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );

    expect(result.materialId).toBe(materialId);
    expect(result.videoContext.title).toBe("Cached video");
    expect(embedTextsInBatches).not.toHaveBeenCalled();
    expect(getYouTubeVideoSource).not.toHaveBeenCalled();
  });
});
