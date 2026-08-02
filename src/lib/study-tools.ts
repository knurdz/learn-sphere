import { z } from "zod";
import type {
  Json,
  StudyArtifact,
  StudyArtifactKind,
} from "@/lib/supabase/database";

const sourceIds = z.array(z.string()).default([]);

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

const videoSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  duration_seconds: z.number().positive(),
  visual_direction: z.string().min(1),
  narration: z.string().min(1),
  on_screen_text: z.string().min(1),
  source_ids: sourceIds,
});

const videoCreateSchema = z.object({
  title: z.string().min(1),
  audience: z.string().min(1),
  duration_seconds: z.number().positive(),
  hook: z.string().min(1),
  scenes: z.array(videoSceneSchema).min(1),
  call_to_action: z.string().min(1),
});

const engagementMomentSchema = z.object({
  timestamp_seconds: z.number().nonnegative(),
  title: z.string().min(1),
  technique: z.string().min(1),
  suggested_edit: z.string().min(1),
  learner_prompt: z.string().min(1),
  source_ids: sourceIds,
});

const videoEngageSchema = z.object({
  material_id: z.string().uuid(),
  title: z.string().min(1),
  opening_hook: z.string().min(1),
  strategy: z.string().min(1),
  chapters: z
    .array(
      z.object({
        timestamp_seconds: z.number().nonnegative(),
        title: z.string().min(1),
      }),
    )
    .min(1),
  engagement_moments: z.array(engagementMomentSchema).min(1),
  closing_cta: z.string().min(1),
});

export type VideoQuizPayload = z.infer<typeof videoQuizSchema>;
export type VideoCreatePayload = z.infer<typeof videoCreateSchema>;
export type VideoEngagePayload = z.infer<typeof videoEngageSchema>;
export type ArtifactPayload =
  | VideoQuizPayload
  | VideoCreatePayload
  | VideoEngagePayload;

export type ClientArtifactPayload =
  | Omit<VideoQuizPayload, "questions"> & {
      questions: Array<
        Omit<VideoQuizPayload["questions"][number], "correct_index" | "explanation"> & {
          explanation?: string;
        }
      >;
    }
  | VideoCreatePayload
  | VideoEngagePayload;

const schemaForKind = {
  video_quiz: videoQuizSchema,
  video_create: videoCreateSchema,
  video_engage: videoEngageSchema,
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

  try {
    return parseStudyArtifactPayload(kind, JSON.parse(candidate));
  } catch (firstError) {
    // Some providers still wrap valid JSON in a short explanation. Only
    // remove surrounding text; schema validation remains authoritative.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return parseStudyArtifactPayload(
          kind,
          JSON.parse(candidate.slice(start, end + 1)),
        );
      } catch {
        // Preserve the original parse error for a useful failure message.
      }
    }

    throw firstError;
  }
}

export function hideQuizAnswers(
  artifact: StudyArtifact,
): StudyArtifact & { payload: ClientArtifactPayload } {
  const payload = parseStudyArtifactPayload(artifact.kind, artifact.payload);

  if (artifact.kind === "video_quiz") {
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
  if (kind === "video_quiz") return "Video quiz";
  if (kind === "video_create") return "Video from scratch";
  return "Make video engaging";
}

export function studyToolPrompt(
  kind: StudyArtifactKind,
  context: string,
  brief = "",
): string {
  const outputRules = {
    video_quiz:
      'Return JSON with {"material_id":"video-material-uuid","questions":[{"id":"q1","prompt":"...","options":["..."],"correct_index":0,"explanation":"...","source_ids":["chunk-id"],"timestamp_seconds":0}]}. Use timestamps from the supplied video excerpts.',
    video_create:
      'Create an original educational video blueprint. Return JSON with {"title":"...","audience":"...","duration_seconds":180,"hook":"...","scenes":[{"id":"scene-1","title":"...","duration_seconds":30,"visual_direction":"...","narration":"...","on_screen_text":"...","source_ids":["chunk-id"]}],"call_to_action":"..."}. Make the scenes practical enough for a presenter or video editor to produce. If source excerpts are present, use them for factual grounding; otherwise use the user brief as the creative source and keep source_ids empty.',
    video_engage:
      'Create a video engagement makeover plan for the supplied lesson video. Return JSON with {"material_id":"video-material-uuid","title":"...","opening_hook":"...","strategy":"...","chapters":[{"timestamp_seconds":0,"title":"..."}],"engagement_moments":[{"timestamp_seconds":30,"title":"...","technique":"...","suggested_edit":"...","learner_prompt":"...","source_ids":["chunk-id"]}],"closing_cta":"..."}. Use only supplied video excerpts and use their timestamps.',
  }[kind];

  const briefInstruction =
    kind === "video_create"
      ? "\n\nUSER VIDEO BRIEF:\n" +
        (brief.trim() || "Create a clear, concise educational lesson from scratch.")
      : "";

  return (
    "Create a useful study artifact from the source excerpts below. " +
    (kind === "video_create"
      ? "For a scratch video, follow the user brief and use any excerpts only when they are available. "
      : "Use only the excerpts. Do not invent facts or citations. ") +
    "Keep the language clear for a student. Return JSON only. " +
    outputRules +
    "\n\nSOURCE EXCERPTS:\n" +
    (context || "No indexed source excerpts were supplied.") +
    briefInstruction
  );
}

export function quizResult(
  payload: VideoQuizPayload,
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
