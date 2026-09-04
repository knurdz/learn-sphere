import { z } from "zod";
import type { AppLanguageCode } from "@/lib/app-language";
import { languageGenerationDirective } from "@/lib/app-language";
import type {
  Json,
  StudyArtifact,
  StudyArtifactKind,
} from "@/lib/supabase/database";

const sourceIds = z.array(z.string()).default([]);

function quizQuestionSchema(minOptions: number) {
  return z
    .object({
      id: z.string().min(1),
      prompt: z.string().min(1),
      options: z.array(z.string().min(1)).min(minOptions),
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
    });
}

/** Strict schema for newly generated quizzes. */
const videoQuizGeneratedSchema = z.object({
  material_id: z.string().uuid(),
  questions: z.array(quizQuestionSchema(4)).min(5),
});

/** Lenient schema for quizzes already saved in the database (including older 1-question quizzes). */
const videoQuizStoredSchema = z.object({
  material_id: z.string().uuid(),
  questions: z.array(quizQuestionSchema(2)).min(1),
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

export type VideoQuizPayload = z.infer<typeof videoQuizStoredSchema>;
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

const generatedSchemaForKind = {
  video_quiz: videoQuizGeneratedSchema,
  video_create: videoCreateSchema,
  video_engage: videoEngageSchema,
} satisfies Record<StudyArtifactKind, z.ZodType<ArtifactPayload>>;

const storedSchemaForKind = {
  video_quiz: videoQuizStoredSchema,
  video_create: videoCreateSchema,
  video_engage: videoEngageSchema,
} satisfies Record<StudyArtifactKind, z.ZodType<ArtifactPayload>>;

export function parseStudyArtifactPayload(
  kind: StudyArtifactKind,
  value: unknown,
): ArtifactPayload {
  return storedSchemaForKind[kind].parse(value);
}

function parseGeneratedPayload(kind: StudyArtifactKind, value: unknown): ArtifactPayload {
  return generatedSchemaForKind[kind].parse(value);
}

export function parseGeneratedStudyArtifact(
  kind: StudyArtifactKind,
  raw: string,
  options: { materialId?: string } = {},
): ArtifactPayload {
  const candidate = raw
    .replace(/^\x60\x60\x60(?:json)?/i, "")
    .replace(/\x60\x60\x60$/i, "")
    .trim();

  const withMaterialId = (value: unknown) => {
    if (
      (kind === "video_quiz" || kind === "video_engage") &&
      options.materialId &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return { ...(value as Record<string, unknown>), material_id: options.materialId };
    }
    return value;
  };

  try {
    return parseGeneratedPayload(kind, withMaterialId(JSON.parse(candidate)));
  } catch (firstError) {
    // Some providers still wrap valid JSON in a short explanation. Only
    // remove surrounding text; schema validation remains authoritative.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return parseGeneratedPayload(
          kind,
          withMaterialId(JSON.parse(candidate.slice(start, end + 1))),
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
  const videoKind = artifact.kind as StudyArtifactKind;
  const payload = parseStudyArtifactPayload(videoKind, artifact.payload);

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
  languageCode: AppLanguageCode = "en",
  materialId?: string,
): string {
  const materialIdRule = materialId
    ? ` The material_id field must be exactly "${materialId}".`
    : "";
  const outputRules = {
    video_quiz:
      'Return JSON with {"material_id":"' +
      (materialId || "video-material-uuid") +
      '","questions":[{"id":"q1","prompt":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"...","source_ids":["chunk-id"],"timestamp_seconds":0}]}.' +
      materialIdRule +
      " Create exactly 5 education-oriented multiple-choice questions." +
      " Each question must name or clearly target a concept or skill from the excerpts and ask why/how/compare/apply — not what the caption literally said." +
      " Each question must have exactly 4 plausible options; wrong options should reflect common misconceptions, not nonsense or near-identical wording." +
      " Each explanation must teach the idea in 1–2 clear sentences (especially useful when the learner is wrong)." +
      " Do NOT ask trivia about whether the viewer watched the video, exact wording, speaker names, channel branding, or timestamps as the learning goal." +
      " Cover different parts of the lesson; use timestamps only as optional anchors.",
    video_create:
      'Create an original educational video blueprint. Return JSON with {"title":"...","audience":"...","duration_seconds":180,"hook":"...","scenes":[{"id":"scene-1","title":"...","duration_seconds":30,"visual_direction":"...","narration":"...","on_screen_text":"...","source_ids":["chunk-id"]}],"call_to_action":"..."}. Make the scenes practical enough for a presenter or video editor to produce. If source excerpts are present, use them for factual grounding; otherwise use the user brief as the creative source and keep source_ids empty.',
    video_engage:
      'Create a video engagement makeover plan for the supplied lesson video. Return JSON with {"material_id":"' +
      (materialId || "video-material-uuid") +
      '","title":"...","opening_hook":"...","strategy":"...","chapters":[{"timestamp_seconds":0,"title":"..."}],"engagement_moments":[{"timestamp_seconds":30,"title":"...","technique":"...","suggested_edit":"...","learner_prompt":"...","source_ids":["chunk-id"]}],"closing_cta":"..."}.' +
      materialIdRule +
      " Use only supplied video excerpts and use their timestamps.",
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
    languageGenerationDirective(languageCode) +
    " " +
    outputRules +
    "\n\nSOURCE EXCERPTS:\n" +
    (context || "No indexed source excerpts were supplied.") +
    briefInstruction
  );
}

/** Pick up to `count` chunks spread evenly across the timeline / list order. */
export function sampleChunksEvenly<T>(chunks: T[], count: number): T[] {
  if (count <= 0 || chunks.length === 0) return [];
  if (chunks.length <= count) return [...chunks];

  const indices = new Set<number>();
  const lastIndex = chunks.length - 1;
  for (let i = 0; i < count; i += 1) {
    const index = Math.round((i * lastIndex) / (count - 1));
    indices.add(index);
  }
  for (let i = 0; i < chunks.length && indices.size < count; i += 1) {
    indices.add(i);
  }
  return [...indices]
    .sort((a, b) => a - b)
    .map((index) => chunks[index]!);
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

export function gradeQuizQuestion(
  payload: VideoQuizPayload,
  questionId: string,
  answer: number,
) {
  const question = payload.questions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error("Question not found.");
  }
  if (answer < 0 || answer >= question.options.length) {
    throw new Error("Answer index is out of range.");
  }
  return {
    questionId: question.id,
    correct: answer === question.correct_index,
    correctIndex: question.correct_index,
    explanation: question.explanation,
  };
}

export function videoQuizGenerationKey(materialId: string): string {
  return `${materialId}:video_quiz`;
}

export type StudySourceVideo = {
  id: string;
  url: string;
  embedUrl: string;
};

/** Extract an 11-char YouTube id from a LearnSphere YouTube material path. */
export function youtubeVideoIdFromStoragePath(storagePath: string): string | null {
  const match = storagePath.match(/youtube-([\w-]{11})(?:\.txt)?(?:$|[?#/])/i);
  return match?.[1] ?? null;
}

export function sourceVideoFromStoragePath(
  storagePath: string | null | undefined,
): StudySourceVideo | null {
  if (!storagePath) return null;
  const id = youtubeVideoIdFromStoragePath(storagePath);
  if (!id) return null;
  return {
    id,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
  };
}

export function materialIdFromStudyArtifact(artifact: {
  material_id?: string | null;
  payload?: unknown;
}): string | null {
  if (typeof artifact.material_id === "string" && artifact.material_id.length > 0) {
    return artifact.material_id;
  }
  const payload =
    artifact.payload && typeof artifact.payload === "object" && !Array.isArray(artifact.payload)
      ? (artifact.payload as Record<string, unknown>)
      : null;
  return payload && typeof payload.material_id === "string" ? payload.material_id : null;
}

/** Keep one video_quiz per material (newest wins); leave other kinds untouched. */
export function dedupeStudyArtifacts<T extends {
  kind: string;
  material_id?: string | null;
  payload?: unknown;
  created_at?: string;
}>(artifacts: T[]): T[] {
  const seenQuizMaterials = new Set<string>();
  const result: T[] = [];

  for (const artifact of artifacts) {
    if (artifact.kind !== "video_quiz") {
      result.push(artifact);
      continue;
    }

    const materialId = materialIdFromStudyArtifact(artifact);

    if (!materialId) {
      result.push(artifact);
      continue;
    }
    if (seenQuizMaterials.has(materialId)) continue;
    seenQuizMaterials.add(materialId);
    result.push(artifact);
  }

  return result;
}

export function jsonValue(value: unknown): Json {
  return value as Json;
}
