import { describe, expect, it } from "vitest";
import type { StudyArtifact } from "@/lib/supabase/database";
import {
  dedupeStudyArtifacts,
  gradeQuizQuestion,
  hideQuizAnswers,
  parseGeneratedStudyArtifact,
  parseStudyArtifactPayload,
  sampleChunksEvenly,
  sourceVideoFromStoragePath,
  studyToolPrompt,
  youtubeVideoIdFromStoragePath,
  type VideoCreatePayload,
  type VideoEngagePayload,
  type VideoQuizPayload,
} from "./study-tools";

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

describe("study tool payloads", () => {
  it("parses a scratch video blueprint without source material", () => {
    const payload = parseGeneratedStudyArtifact(
      "video_create",
      JSON.stringify({
        title: "Photosynthesis in three minutes",
        audience: "Early secondary students",
        duration_seconds: 180,
        hook: "How do plants make their own food?",
        scenes: [
          {
            id: "scene-1",
            title: "The question",
            duration_seconds: 30,
            visual_direction: "Show a plant in sunlight.",
            narration: "Plants use light energy to make food.",
            on_screen_text: "Light + water + carbon dioxide",
          },
        ],
        call_to_action: "Explain the process in your own words.",
      }),
    ) as VideoCreatePayload;

    expect(payload.scenes).toHaveLength(1);
    expect(payload.scenes[0].source_ids).toEqual([]);
  });

  it("parses an indexed-video engagement plan", () => {
    const payload = parseGeneratedStudyArtifact(
      "video_engage",
      JSON.stringify({
        material_id: "11111111-1111-4111-8111-111111111111",
        title: "More engaging lesson plan",
        opening_hook: "Pause and predict what happens next.",
        strategy: "Add prediction moments before each concept change.",
        chapters: [{ timestamp_seconds: 0, title: "Introduction" }],
        engagement_moments: [
          {
            timestamp_seconds: 30,
            title: "Prediction pause",
            technique: "Active recall",
            suggested_edit: "Cut to a question card for five seconds.",
            learner_prompt: "What do you think happens next?",
          },
        ],
        closing_cta: "Summarize the key idea before moving on.",
      }),
    ) as VideoEngagePayload;

    expect(payload.material_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.engagement_moments[0].timestamp_seconds).toBe(30);
  });

  it("overwrites a placeholder material_id with the real video UUID", () => {
    const materialId = "11111111-1111-4111-8111-111111111111";
    const payload = parseGeneratedStudyArtifact(
      "video_quiz",
      JSON.stringify({
        material_id: "video-material-uuid",
        questions: fiveQuizQuestions(),
      }),
      { materialId },
    ) as VideoQuizPayload;

    expect(payload.material_id).toBe(materialId);
    expect(payload.questions).toHaveLength(5);
  });

  it("rejects quizzes with fewer than 5 questions", () => {
    expect(() =>
      parseGeneratedStudyArtifact(
        "video_quiz",
        JSON.stringify({
          material_id: "11111111-1111-4111-8111-111111111111",
          questions: fiveQuizQuestions().slice(0, 1),
        }),
      ),
    ).toThrow();
  });

  it("includes educational quiz rules and the real material UUID in the prompt", () => {
    const materialId = "11111111-1111-4111-8111-111111111111";
    const prompt = studyToolPrompt("video_quiz", "excerpt", "", "en", materialId);
    expect(prompt).toContain(materialId);
    expect(prompt).toContain(`The material_id field must be exactly "${materialId}"`);
    expect(prompt).toMatch(/exactly 5 education-oriented/i);
    expect(prompt).toMatch(/why\/how\/compare\/apply/i);
    expect(prompt).toMatch(/common misconceptions/i);
    expect(prompt).toMatch(/Do NOT ask trivia/i);
  });

  it("samples chunks evenly across the timeline", () => {
    const chunks = Array.from({ length: 20 }, (_, index) => ({ id: index }));
    const sampled = sampleChunksEvenly(chunks, 5);
    expect(sampled.map((chunk) => chunk.id)).toEqual([0, 5, 10, 14, 19]);
  });

  it("extracts YouTube ids from material storage paths", () => {
    expect(
      youtubeVideoIdFromStoragePath(
        "user/22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/youtube-abc123XYZ01.txt",
      ),
    ).toBe("abc123XYZ01");
    expect(sourceVideoFromStoragePath("materials/notes.pdf")).toBeNull();
    expect(
      sourceVideoFromStoragePath(
        "user/x/y/youtube-dQw4w9WgXcQ.txt",
      ),
    ).toEqual({
      id: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("grades a single quiz question", () => {
    const payload = {
      material_id: "11111111-1111-4111-8111-111111111111",
      questions: fiveQuizQuestions(),
    } as VideoQuizPayload;
    expect(gradeQuizQuestion(payload, "q2", 0)).toMatchObject({
      questionId: "q2",
      correct: true,
      correctIndex: 0,
    });
    expect(gradeQuizQuestion(payload, "q2", 1).correct).toBe(false);
  });

  it("dedupes video quizzes by material, keeping the newest", () => {
    const materialId = "11111111-1111-4111-8111-111111111111";
    const newest = {
      id: "a",
      kind: "video_quiz",
      material_id: materialId,
      created_at: "2026-01-02T00:00:00.000Z",
    };
    const older = {
      id: "b",
      kind: "video_quiz",
      payload: { material_id: materialId },
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const create = {
      id: "c",
      kind: "video_create",
      created_at: "2026-01-03T00:00:00.000Z",
    };
    expect(dedupeStudyArtifacts([newest, older, create]).map((item) => item.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("hides answers for older saved quizzes with a single question", () => {
    const artifact = {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: "22222222-2222-4222-8222-222222222222",
      study_space_id: "33333333-3333-4333-8333-333333333333",
      kind: "video_quiz",
      title: "Video quiz: Legacy",
      payload: {
        material_id: "11111111-1111-4111-8111-111111111111",
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
    } as StudyArtifact;

    const client = hideQuizAnswers(artifact);
    expect(client.payload).toMatchObject({
      material_id: "11111111-1111-4111-8111-111111111111",
      questions: [
        {
          id: "q1",
          prompt: "What is photosynthesis?",
          options: ["Making food with light", "Breathing at night"],
          source_ids: ["44444444-4444-4444-8444-444444444444"],
          timestamp_seconds: 12,
        },
      ],
    });
    if (!("questions" in client.payload)) {
      throw new Error("expected quiz payload");
    }
    expect(client.payload.questions[0]).not.toHaveProperty("correct_index");
    expect(client.payload.questions[0]).not.toHaveProperty("explanation");

    const stored = parseStudyArtifactPayload(
      "video_quiz",
      artifact.payload,
    ) as VideoQuizPayload;
    expect(stored.questions).toHaveLength(1);
    expect(stored.questions[0].correct_index).toBe(0);
  });
});
