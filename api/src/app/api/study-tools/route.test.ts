import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const materialId = "11111111-1111-4111-8111-111111111111";
const studySpaceId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/youtube-study-source", () => ({
  ensureYouTubeStudySource: vi.fn(),
}));

vi.mock("@/lib/providers/groq", () => ({
  generateGroqText: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthContext: vi.fn(),
}));

import { POST } from "./route";
import { ensureYouTubeStudySource } from "@/lib/youtube-study-source";
import { generateGroqText } from "@/lib/providers/groq";
import { getAuthContext } from "@/lib/supabase/server";

function chain(
  result: { data: unknown; error: unknown },
  terminal: "maybeSingle" | "single" | "limit" = "maybeSingle",
) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "in", "order", "limit", "insert"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder[terminal] = vi.fn(async () => result);
  if (terminal !== "limit") {
    builder.single = vi.fn(async () => result);
    builder.maybeSingle = vi.fn(async () => result);
  }
  builder.then = vi.fn((onFulfilled: (value: typeof result) => unknown) =>
    Promise.resolve(result).then(onFulfilled),
  ) as never;
  return builder;
}

function createSupabase(options: { materials?: unknown[]; chunks?: unknown[] }) {
  const chunks = options.chunks ?? [
    {
      id: "44444444-4444-4444-8444-444444444444",
      material_id: materialId,
      content: "Transcript excerpt about photosynthesis.",
      page_number: null,
      start_seconds: 0,
      end_seconds: 12,
      chunk_index: 0,
    },
  ];

  return {
    from: vi.fn((table: string) => {
      if (table === "study_spaces") {
        return chain({ data: { id: studySpaceId, name: "English" }, error: null });
      }
      if (table === "materials") {
        return chain({ data: options.materials ?? [], error: null }, "limit");
      }
      if (table === "material_chunks") {
        return chain({ data: chunks, error: null }, "limit");
      }
      if (table === "study_artifacts") {
        return chain(
          {
            data: {
              id: "55555555-5555-4555-8555-555555555555",
              user_id: userId,
              study_space_id: studySpaceId,
              kind: "video_quiz",
              title: "Video quiz: Sample",
              payload: {
                material_id: materialId,
                questions: [
                  {
                    id: "q1",
                    prompt: "What is discussed?",
                    options: ["Photosynthesis", "Volcanoes"],
                    correct_index: 0,
                    explanation: "The excerpt mentions photosynthesis.",
                    source_ids: ["44444444-4444-4444-8444-444444444444"],
                    timestamp_seconds: 0,
                  },
                ],
              },
              created_at: new Date().toISOString(),
            },
            error: null,
          },
          "single",
        );
      }
      return chain({ data: null, error: null });
    }),
  };
}

describe("POST /api/study-tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates from a YouTube URL when the library has no videos", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ materials: [] }) as never,
    } as never);

    vi.mocked(ensureYouTubeStudySource).mockResolvedValue({
      materialId,
      videoContext: {
        id: "abc123",
        url: "https://www.youtube.com/watch?v=abc123",
        embedUrl: "https://www.youtube.com/embed/abc123",
        title: "Sample",
        author: "Creator",
        transcript: "Transcript excerpt about photosynthesis.",
      },
    });

    vi.mocked(generateGroqText).mockResolvedValue(
      JSON.stringify({
        material_id: materialId,
        questions: [
          {
            id: "q1",
            prompt: "What is discussed?",
            options: ["Photosynthesis", "Volcanoes"],
            correct_index: 0,
            explanation: "The excerpt mentions photosynthesis.",
            source_ids: ["44444444-4444-4444-8444-444444444444"],
            timestamp_seconds: 0,
          },
        ],
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
          youtubeUrl: "https://www.youtube.com/watch?v=abc123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(ensureYouTubeStudySource).toHaveBeenCalledOnce();
    const body = (await response.json()) as { artifact: { title: string } };
    expect(body.artifact.title).toContain("Sample");
  });

  it("returns a helpful error when quiz generation has no library video or YouTube URL", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ materials: [], chunks: [] }) as never,
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("YouTube URL");
    expect(ensureYouTubeStudySource).not.toHaveBeenCalled();
  });
});
