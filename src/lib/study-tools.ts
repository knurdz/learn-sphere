import { z } from "zod";
import type {
  Json,
  StudyArtifact,
  StudyArtifactKind,
} from "@/lib/supabase/database";

const sourceIds = z.array(z.string()).default([]);

const guideSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        bullets: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  takeaways: z.array(z.string().min(1)).min(1),
});

const flashcardsSchema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        source_ids: sourceIds,
      }),
    )
    .min(1),
});

const practiceTestSchema = z.object({
  questions: z
    .array(
      z
        .object({
          id: z.string().min(1),
          prompt: z.string().min(1),
          options: z.array(z.string().min(1)).min(2),
          correct_index: z.number().int().nonnegative(),
          explanation: z.string().min(1),
          source_ids: sourceIds,
        })
        .superRefine((question, context) => {
          if (question.correct_index >= question.options.length) {
            context.addIssue({
              code: "custom",
              message: "correct_index must point to an option",
              path: ["correct_index"],
            });
          }
        }),
    )
    .min(1),
});

const videoQuizSchema = z.object({
  material_id: z.string().uuid(),
  questions: z
    .array(
      z
        .object({
          id: z.string().min(1),
          prompt: z.string().min(1),
          options: z.array(z.string().min(1)).min(2),
          correct_index: z.number().int().nonnegative(),
          explanation: z.string().min(1),
          source_ids: sourceIds,
          timestamp_seconds: z.number().nonnegative(),
        })
        .superRefine((question, context) => {
          if (question.correct_index >= question.options.length) {
            context.addIssue({
              code: "custom",
              message: "correct_index must point to an option",
              path: ["correct_index"],
            });
          }
        }),
    )
    .min(1),
});

export type GuidePayload = z.infer<typeof guideSchema>;
export type FlashcardsPayload = z.infer<typeof flashcardsSchema>;
export type PracticeTestPayload = z.infer<typeof practiceTestSchema>;
export type VideoQuizPayload = z.infer<typeof videoQuizSchema>;
export type ArtifactPayload =
  | GuidePayload
  | FlashcardsPayload
  | PracticeTestPayload
  | VideoQuizPayload;

export type ClientArtifactPayload =
  | GuidePayload
  | FlashcardsPayload
  | Omit<PracticeTestPayload, "questions"> & {
      questions: Array<
        Omit<PracticeTestPayload["questions"][number], "correct_index" | "explanation"> & {
          explanation?: string;
        }
      >;
    }
  | Omit<VideoQuizPayload, "questions"> & {
      questions: Array<
        Omit<VideoQuizPayload["questions"][number], "correct_index" | "explanation"> & {
          explanation?: string;
        }
      >;
    };

const schemaForKind = {
  guide: guideSchema,
  flashcards: flashcardsSchema,
  practice_test: practiceTestSchema,
  video_quiz: videoQuizSchema,
} satisfies Record<StudyArtifactKind, z.ZodType<ArtifactPayload>>;

export function parseStudyArtifactPayload(
  kind: StudyArtifactKind,
  value: unknown,
): ArtifactPayload {
  return schemaForKind[kind].parse(value);
}

export function parseGeneratedStudyArtifact(
  kind: StudyArtifactKind,
  raw: string,
): ArtifactPayload {
  const candidate = raw
    .replace(/^\x60\x60\x60(?:json)?/i, "")
    .replace(/\x60\x60\x60$/i, "")
    .trim();
  return parseStudyArtifactPayload(kind, JSON.parse(candidate));
}

export function hideQuizAnswers(
  artifact: StudyArtifact,
): StudyArtifact & { payload: ClientArtifactPayload } {
  const payload = parseStudyArtifactPayload(artifact.kind, artifact.payload);

  if (artifact.kind === "practice_test" || artifact.kind === "video_quiz") {
    if (!("questions" in payload)) {
      throw new Error("Quiz payload is missing questions.");
    }
    return {
      ...artifact,
      payload: {
        ...payload,
        questions: payload.questions.map((question) => {
          const clientQuestion = {
            id: question.id,
            prompt: question.prompt,
            options: question.options,
            source_ids: question.source_ids,
          };
          if ("timestamp_seconds" in question) {
            return {
              ...clientQuestion,
              timestamp_seconds: question.timestamp_seconds,
            };
          }
          return clientQuestion;
        }),
      },
    } as StudyArtifact & { payload: ClientArtifactPayload };
  }

  return {
    ...artifact,
    payload,
  } as StudyArtifact & { payload: ClientArtifactPayload };
}

export function artifactTitle(kind: StudyArtifactKind): string {
  if (kind === "guide") return "AI study guide";
  if (kind === "flashcards") return "AI flashcards";
  if (kind === "practice_test") return "Practice test";
  return "Video quiz";
}

export function studyToolPrompt(
  kind: StudyArtifactKind,
  context: string,
): string {
  const outputRules = {
    guide:
      'Return JSON with {"sections":[{"title":"...","bullets":["..."]}],"takeaways":["..."]}.',
    flashcards:
      'Return JSON with {"cards":[{"question":"...","answer":"...","source_ids":["chunk-id"]}]}.',
    practice_test:
      'Return JSON with {"questions":[{"id":"q1","prompt":"...","options":["..."],"correct_index":0,"explanation":"...","source_ids":["chunk-id"]}]}.',
    video_quiz:
      'Return JSON with {"material_id":"video-material-uuid","questions":[{"id":"q1","prompt":"...","options":["..."],"correct_index":0,"explanation":"...","source_ids":["chunk-id"],"timestamp_seconds":0}]}. Use timestamps from the supplied video excerpts.',
  }[kind];

  return (
    "Create a useful study artifact from the source excerpts below. " +
    "Use only the excerpts. Do not invent facts or citations. " +
    "Keep the language clear for a student. Return JSON only. " +
    outputRules +
    "\n\nSOURCE EXCERPTS:\n" +
    context
  );
}

export function quizResult(
  payload: PracticeTestPayload | VideoQuizPayload,
  answers: Record<string, number>,
) {
  const feedback = payload.questions.map((question) => ({
    questionId: question.id,
    correct: answers[question.id] === question.correct_index,
    correctIndex: question.correct_index,
    explanation: question.explanation,
  }));
  const correctCount = feedback.filter((item) => item.correct).length;

  return {
    score: Math.round((correctCount / payload.questions.length) * 100),
    correctCount,
    total: payload.questions.length,
    feedback,
  };
}

export function jsonValue(value: unknown): Json {
  return value as Json;
}
