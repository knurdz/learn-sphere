import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const artifactId = "55555555-5555-4555-8555-555555555555";
const userId = "22222222-2222-4222-8222-222222222222";
const materialId = "11111111-1111-4111-8111-111111111111";

vi.mock("@/lib/supabase/server", () => ({
  getAuthContext: vi.fn(),
}));

import { POST } from "./route";
import { getAuthContext } from "@/lib/supabase/server";

function fiveQuizQuestions() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Concept check ${index + 1}?`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correct_index: index === 1 ? 2 : 0,
    explanation: `Teach concept ${index + 1}.`,
    source_ids: ["44444444-4444-4444-8444-444444444444"],
    timestamp_seconds: index * 10,
  }));
}

describe("POST /api/study-tools/[id]/grade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns feedback for one question without creating an attempt", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_artifacts") {
          const builder: Record<string, ReturnType<typeof vi.fn>> = {};
          for (const method of ["select", "eq"]) {
            builder[method] = vi.fn(() => builder);
          }
          builder.maybeSingle = vi.fn(async () => ({
            data: {
              id: artifactId,
              user_id: userId,
              kind: "video_quiz",
              payload: {
                material_id: materialId,
                questions: fiveQuizQuestions(),
              },
            },
            error: null,
          }));
          return builder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await POST(
      new NextRequest(`http://localhost/api/study-tools/${artifactId}/grade`, {
        method: "POST",
        body: JSON.stringify({ questionId: "q2", answer: 2 }),
      }),
      { params: Promise.resolve({ id: artifactId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      questionId: "q2",
      correct: true,
      correctIndex: 2,
      explanation: "Teach concept 2.",
    });
  });

  it("returns 400 for an unknown question id", async () => {
    const supabase = {
      from: vi.fn(() => {
        const builder: Record<string, ReturnType<typeof vi.fn>> = {};
        for (const method of ["select", "eq"]) {
          builder[method] = vi.fn(() => builder);
        }
        builder.maybeSingle = vi.fn(async () => ({
          data: {
            id: artifactId,
            user_id: userId,
            kind: "video_quiz",
            payload: {
              material_id: materialId,
              questions: fiveQuizQuestions(),
            },
          },
          error: null,
        }));
        return builder;
      }),
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await POST(
      new NextRequest(`http://localhost/api/study-tools/${artifactId}/grade`, {
        method: "POST",
        body: JSON.stringify({ questionId: "missing", answer: 0 }),
      }),
      { params: Promise.resolve({ id: artifactId }) },
    );

    expect(response.status).toBe(400);
  });
});
