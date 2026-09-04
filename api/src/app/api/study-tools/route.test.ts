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

import { GET, POST } from "./route";
import { ensureYouTubeStudySource } from "@/lib/youtube-study-source";
import { generateGroqText } from "@/lib/providers/groq";
import { getAuthContext } from "@/lib/supabase/server";
import { YouTubeCaptionsMissingError } from "@/lib/youtube";

function fiveQuizQuestions() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Concept check ${index + 1}?`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correct_index: 0,
    explanation: "Because the excerpt supports option A.",
    source_ids: ["44444444-4444-4444-8444-444444444444"],
    timestamp_seconds: index * 10,
  }));
}

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
        const materials = options.materials ?? [];
        const youtubeMaterial = {
          id: materialId,
          name: "Sample",
          mime_type: "video/mp4",
          storage_path: `user/${userId}/${materialId}/youtube-abc123XYZ01.txt`,
        };
        const builder: Record<string, ReturnType<typeof vi.fn>> = {};
        for (const method of ["select", "eq", "in", "order", "limit"]) {
          builder[method] = vi.fn(() => builder);
        }
        builder.maybeSingle = vi.fn(async () => ({
          data: youtubeMaterial,
          error: null,
        }));
        builder.then = vi.fn((onFulfilled: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: materials, error: null }).then(onFulfilled),
        ) as never;
        return builder;
      }
      if (table === "material_chunks") {
        return chain({ data: chunks, error: null }, "limit");
      }
      if (table === "study_artifacts") {
        const artifact = {
          id: "55555555-5555-4555-8555-555555555555",
          user_id: userId,
          study_space_id: studySpaceId,
          kind: "video_quiz",
          title: "Video quiz: Sample",
          material_id: materialId,
          generation_key: `${materialId}:video_quiz`,
          payload: {
            material_id: materialId,
            questions: fiveQuizQuestions(),
          },
          created_at: new Date().toISOString(),
        };
        const builder: Record<string, ReturnType<typeof vi.fn>> = {};
        for (const method of [
          "select",
          "eq",
          "in",
          "order",
          "limit",
          "insert",
          "update",
          "delete",
        ]) {
          builder[method] = vi.fn(() => builder);
        }
        // Lookup for existing quiz / legacy list → none yet.
        builder.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
        builder.single = vi.fn(async () => ({ data: artifact, error: null }));
        builder.then = vi.fn((onFulfilled: (value: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(onFulfilled),
        ) as never;
        return builder;
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
        questions: fiveQuizQuestions(),
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
    expect(ensureYouTubeStudySource).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      studySpaceId,
      "https://www.youtube.com/watch?v=abc123",
      expect.objectContaining({ allowAudioTranscription: false }),
    );
    const body = (await response.json()) as { artifact: { title: string } };
    expect(body.artifact.title).toContain("Sample");
  });

  it("returns 409 when captions are missing and audio transcription is not allowed", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ materials: [] }) as never,
    } as never);

    vi.mocked(ensureYouTubeStudySource).mockRejectedValue(new YouTubeCaptionsMissingError());

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
          youtubeUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
        }),
      }),
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.code).toBe("YOUTUBE_CAPTIONS_MISSING");
    expect(body.error).toMatch(/extra credits/i);
  });

  it("retries YouTube indexing with audio transcription when the client confirms", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ materials: [] }) as never,
    } as never);

    vi.mocked(ensureYouTubeStudySource).mockResolvedValue({
      materialId,
      videoContext: {
        id: "abc123XYZ01",
        url: "https://www.youtube.com/watch?v=abc123XYZ01",
        embedUrl: "https://www.youtube.com/embed/abc123XYZ01",
        title: "Sample",
        author: "Creator",
        transcript: "Transcript excerpt about photosynthesis.",
      },
    });

    vi.mocked(generateGroqText).mockResolvedValue(
      JSON.stringify({
        material_id: materialId,
        questions: fiveQuizQuestions(),
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
          youtubeUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
          allowAudioTranscription: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(ensureYouTubeStudySource).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      studySpaceId,
      "https://www.youtube.com/watch?v=abc123XYZ01",
      expect.objectContaining({ allowAudioTranscription: true }),
    );
  });

  it("recovers when Groq returns a placeholder material_id", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ materials: [] }) as never,
    } as never);

    vi.mocked(ensureYouTubeStudySource).mockResolvedValue({
      materialId,
      videoContext: {
        id: "abc123XYZ01",
        url: "https://www.youtube.com/watch?v=abc123XYZ01",
        embedUrl: "https://www.youtube.com/embed/abc123XYZ01",
        title: "Sample",
        author: "Creator",
        transcript: "Transcript excerpt about photosynthesis.",
      },
    });

    vi.mocked(generateGroqText).mockResolvedValue(
      JSON.stringify({
        material_id: "video-material-uuid",
        questions: fiveQuizQuestions(),
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
          youtubeUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      artifact: { payload: { material_id?: string } };
    };
    expect(body.artifact.payload.material_id).toBe(materialId);
    expect(generateGroqText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining(materialId),
          }),
        ],
        maxTokens: 2500,
      }),
    );
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

describe("GET /api/study-tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid artifacts and skips unparseable rows", async () => {
    const validArtifact = {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_quiz",
      title: "Video quiz: Sample",
      payload: {
        material_id: materialId,
        questions: fiveQuizQuestions(),
      },
      created_at: new Date().toISOString(),
    };
    const legacyArtifact = {
      id: "66666666-6666-4666-8666-666666666666",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_quiz",
      title: "Video quiz: Legacy",
      payload: {
        material_id: materialId,
        questions: [
          {
            id: "q1",
            prompt: "What is photosynthesis?",
            options: ["Making food with light", "Breathing at night"],
            correct_index: 0,
            explanation: "Plants use light to make food.",
            source_ids: ["44444444-4444-4444-8444-444444444444"],
            timestamp_seconds: 12,
          },
        ],
      },
      created_at: new Date().toISOString(),
    };
    const corruptArtifact = {
      id: "77777777-7777-4777-8777-777777777777",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_quiz",
      title: "Video quiz: Broken",
      payload: { not_a_quiz: true },
      created_at: new Date().toISOString(),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_artifacts") {
          return chain(
            {
              data: [validArtifact, legacyArtifact, corruptArtifact],
              error: null,
            },
            "limit",
          );
        }
        if (table === "learning_progress") {
          return chain({ data: [], error: null }, "limit");
        }
        return chain({ data: null, error: null });
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/study-tools?studySpaceId=${studySpaceId}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      artifacts: Array<{ id: string; payload: { questions?: unknown[] } }>;
      progress: unknown[];
    };
    // Newest quiz for the material is kept; legacy duplicate for same material is dropped.
    expect(body.artifacts.map((item) => item.id)).toEqual([validArtifact.id]);
    expect(body.artifacts[0].payload.questions).toHaveLength(5);
  });

  it("keeps quizzes for different videos", async () => {
    const otherMaterial = "99999999-9999-4999-8999-999999999999";
    const first = {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_quiz",
      title: "Video quiz: A",
      material_id: materialId,
      payload: { material_id: materialId, questions: fiveQuizQuestions() },
      created_at: new Date().toISOString(),
    };
    const second = {
      id: "66666666-6666-4666-8666-666666666666",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_quiz",
      title: "Video quiz: B",
      material_id: otherMaterial,
      payload: {
        material_id: otherMaterial,
        questions: [
          {
            id: "q1",
            prompt: "What is photosynthesis?",
            options: ["Making food with light", "Breathing at night"],
            correct_index: 0,
            explanation: "Plants use light to make food.",
            source_ids: ["44444444-4444-4444-8444-444444444444"],
            timestamp_seconds: 12,
          },
        ],
      },
      created_at: new Date().toISOString(),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_artifacts") {
          return chain({ data: [first, second], error: null }, "limit");
        }
        if (table === "learning_progress") {
          return chain({ data: [], error: null }, "limit");
        }
        if (table === "materials") {
          return chain(
            {
              data: [
                {
                  id: materialId,
                  storage_path: `user/${userId}/${materialId}/youtube-abc123XYZ01.txt`,
                },
                {
                  id: otherMaterial,
                  storage_path: `user/${userId}/${otherMaterial}/notes.pdf`,
                },
              ],
              error: null,
            },
            "limit",
          );
        }
        return chain({ data: null, error: null });
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/study-tools?studySpaceId=${studySpaceId}`,
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      artifacts: Array<{ id: string; sourceVideo: { id: string } | null }>;
    };
    expect(body.artifacts.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(body.artifacts[0].sourceVideo).toEqual({
      id: "abc123XYZ01",
      url: "https://www.youtube.com/watch?v=abc123XYZ01",
      embedUrl: "https://www.youtube.com/embed/abc123XYZ01",
    });
    expect(body.artifacts[1].sourceVideo).toBeNull();
  });

  it("attaches sourceVideo for engage tools linked to a YouTube material", async () => {
    const engage = {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: userId,
      study_space_id: studySpaceId,
      kind: "video_engage",
      title: "Make video engaging: Sample",
      material_id: materialId,
      payload: {
        material_id: materialId,
        title: "Sample",
        opening_hook: "Hook",
        strategy: "Strategy",
        chapters: [{ timestamp_seconds: 0, title: "Intro" }],
        engagement_moments: [
          {
            timestamp_seconds: 12,
            title: "Pause",
            technique: "Recall",
            suggested_edit: "Cut to card",
            learner_prompt: "Predict",
            source_ids: [],
          },
        ],
        closing_cta: "Done",
      },
      created_at: new Date().toISOString(),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_artifacts") {
          return chain({ data: [engage], error: null }, "limit");
        }
        if (table === "learning_progress") {
          return chain({ data: [], error: null }, "limit");
        }
        if (table === "materials") {
          return chain(
            {
              data: [
                {
                  id: materialId,
                  storage_path: `user/${userId}/${materialId}/youtube-dQw4w9WgXcQ.txt`,
                },
              ],
              error: null,
            },
            "limit",
          );
        }
        return chain({ data: null, error: null });
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/study-tools?studySpaceId=${studySpaceId}`,
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      artifacts: Array<{ sourceVideo: { id: string } | null }>;
    };
    expect(body.artifacts[0].sourceVideo?.id).toBe("dQw4w9WgXcQ");
  });
});

describe("POST quiz exists / replace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns QUIZ_EXISTS when a quiz already exists for the video", async () => {
    const existingId = "55555555-5555-4555-8555-555555555555";
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_spaces") {
          return chain({ data: { id: studySpaceId, name: "English" }, error: null });
        }
        if (table === "materials") {
          return chain(
            {
              data: [
                {
                  id: materialId,
                  name: "Sample",
                  mime_type: "video/mp4",
                },
              ],
              error: null,
            },
            "limit",
          );
        }
        if (table === "study_artifacts") {
          return chain({
            data: { id: existingId, title: "Video quiz: Sample" },
            error: null,
          });
        }
        return chain({ data: null, error: null });
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    vi.mocked(ensureYouTubeStudySource).mockResolvedValue({
      materialId,
      videoContext: {
        id: "abc123XYZ01",
        url: "https://www.youtube.com/watch?v=abc123XYZ01",
        embedUrl: "https://www.youtube.com/embed/abc123XYZ01",
        title: "Sample",
        author: "Creator",
        transcript: "Transcript excerpt about photosynthesis.",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/study-tools", {
        method: "POST",
        body: JSON.stringify({
          studySpaceId,
          kind: "video_quiz",
          youtubeUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
        }),
      }),
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("QUIZ_EXISTS");
    expect(generateGroqText).not.toHaveBeenCalled();
  });
});
