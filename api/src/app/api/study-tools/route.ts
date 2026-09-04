import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateGroqText, GroqRateLimitError } from "@/lib/providers/groq";
import {
  artifactTitle,
  dedupeStudyArtifacts,
  hideQuizAnswers,
  jsonValue,
  parseGeneratedStudyArtifact,
  sampleChunksEvenly,
  studyToolPrompt,
  videoQuizGenerationKey,
  type ClientArtifactPayload,
} from "@/lib/study-tools";
import type {
  MaterialChunk,
  LearningProgress,
  StudyArtifact,
  StudyArtifactKind,
} from "@/lib/supabase/database";
import { ensureYouTubeStudySource } from "@/lib/youtube-study-source";
import { YouTubeCaptionsMissingError } from "@/lib/youtube";
import { EmbeddingRateLimitError } from "@/lib/providers/gemini-embeddings";
import { resolveAppLanguage } from "@/lib/app-language";
import { recordActivityFailOpen, readTimezoneFromRequest } from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const supportedKinds = ["video_quiz", "video_create", "video_engage"] as const;

const requestSchema = z.object({
  studySpaceId: z.string().uuid(),
  kind: z.enum([
    "video_quiz",
    "video_create",
    "video_engage",
  ]),
  brief: z.string().trim().max(1500).optional(),
  youtubeUrl: z.string().trim().max(500).optional(),
  allowAudioTranscription: z.boolean().optional(),
  replaceExisting: z.boolean().optional(),
});

type SourceChunk = Pick<
  MaterialChunk,
  | "id"
  | "material_id"
  | "content"
  | "page_number"
  | "start_seconds"
  | "end_seconds"
> & {
  material_name: string;
};

function sourceContext(
  chunks: SourceChunk[],
  options: { maxChunks?: number; maxCharsPerChunk?: number } = {},
) {
  const maxChunks = options.maxChunks ?? chunks.length;
  const maxChars = options.maxCharsPerChunk ?? 1100;
  return chunks
    .slice(0, maxChunks)
    .map((chunk) => {
      const location =
        chunk.page_number !== null
          ? "page " + chunk.page_number
          : chunk.start_seconds !== null
            ? "timestamp " + Math.floor(chunk.start_seconds) + " seconds"
            : "source excerpt";
      return (
        "[SOURCE " +
        chunk.id +
        "] material=" +
        chunk.material_name +
        " material_id=" +
        chunk.material_id +
        " location=" +
        location +
        "\n" +
        chunk.content.slice(0, maxChars)
      );
    })
    .join("\n\n");
}

async function getStudySpaceMaterials(
  userId: string,
  studySpaceId: string,
  kind: StudyArtifactKind,
  supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"],
) {
  if (!supabase) return { materials: [], error: "Supabase is not configured." };

  const { data: materials, error: materialError } = await supabase
    .from("materials")
    .select("id,name,mime_type")
    .eq("user_id", userId)
    .eq("study_space_id", studySpaceId)
    .eq("status", "ready");

  if (materialError) return { materials: [], error: materialError.message };

  const readyMaterials = materials ?? [];
  const selectedMaterials =
    kind === "video_quiz" || kind === "video_engage"
      ? readyMaterials.filter((material) => material.mime_type.startsWith("video/"))
      : readyMaterials;

  return { materials: selectedMaterials, error: null };
}

export async function GET(request: NextRequest) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const studySpaceId = request.nextUrl.searchParams.get("studySpaceId");
  if (!studySpaceId || !z.string().uuid().safeParse(studySpaceId).success) {
    return NextResponse.json({ error: "A valid study space is required." }, { status: 400 });
  }

  const { data: artifacts, error } = await context.supabase
    .from("study_artifacts")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("study_space_id", studySpaceId)
    .in("kind", [...supportedKinds])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: progress } = await context.supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("study_space_id", studySpaceId)
    .in("item_type", [...supportedKinds]);

  const safeArtifacts: Array<StudyArtifact & { payload: ClientArtifactPayload }> = [];
  for (const artifact of dedupeStudyArtifacts(artifacts ?? [])) {
    try {
      safeArtifacts.push(hideQuizAnswers(artifact as StudyArtifact));
    } catch {
      // Skip rows that cannot be parsed (e.g. corrupt payloads) instead of
      // failing the whole Study tools list.
    }
  }

  return NextResponse.json({
    artifacts: safeArtifacts,
    progress: (progress ?? []) as LearningProgress[],
  });
}

export async function POST(request: NextRequest) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Choose a valid study space and study tool." },
      { status: 400 },
    );
  }

  const { studySpaceId, kind } = parsedBody.data;
  const languageCode = resolveAppLanguage(request);
  const youtubeUrl = parsedBody.data.youtubeUrl?.trim() ?? "";
  const brief = parsedBody.data.brief?.trim() ?? "";
  const allowAudioTranscription = parsedBody.data.allowAudioTranscription === true;
  const replaceExisting = parsedBody.data.replaceExisting === true;
  const { data: space, error: spaceError } = await context.supabase
    .from("study_spaces")
    .select("id,name")
    .eq("id", studySpaceId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (spaceError) {
    return NextResponse.json({ error: spaceError.message }, { status: 500 });
  }
  if (!space) {
    return NextResponse.json({ error: "Study space not found." }, { status: 404 });
  }

  let youtubeVideoTitle: string | null = null;
  let materialResult = await getStudySpaceMaterials(
    context.user.id,
    studySpaceId,
    kind,
    context.supabase,
  );

  if (youtubeUrl) {
    try {
      const source = await ensureYouTubeStudySource(
        context.supabase,
        context.user.id,
        studySpaceId,
        youtubeUrl,
        {
          preferredLanguage: languageCode,
          allowAudioTranscription,
        },
      );
      youtubeVideoTitle = source.videoContext.title;
      materialResult = {
        materials: [
          {
            id: source.materialId,
            name: source.videoContext.title,
            mime_type: "video/mp4",
          },
        ],
        error: null,
      };
    } catch (error) {
      if (error instanceof YouTubeCaptionsMissingError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 409 },
        );
      }
      if (error instanceof EmbeddingRateLimitError) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }
      const message =
        error instanceof Error ? error.message : "Could not load the YouTube video.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (materialResult.error) {
    return NextResponse.json({ error: materialResult.error }, { status: 500 });
  }

  const requiresIndexedVideo = kind === "video_quiz" || kind === "video_engage";
  if (requiresIndexedVideo && materialResult.materials.length === 0) {
    return NextResponse.json(
      {
        error:
          "Paste a YouTube URL, or index a Library video first.",
      },
      { status: 400 },
    );
  }

  const materialIds = materialResult.materials.map((material) => material.id);
  const boundMaterialId =
    kind === "video_quiz" || kind === "video_engage" ? materialIds[0] : undefined;
  const generationKey =
    kind === "video_quiz" && boundMaterialId
      ? videoQuizGenerationKey(boundMaterialId)
      : null;

  let existingQuizId: string | null = null;
  if (kind === "video_quiz" && generationKey) {
    const { data: existing, error: existingError } = await context.supabase
      .from("study_artifacts")
      .select("id,title")
      .eq("user_id", context.user.id)
      .eq("study_space_id", studySpaceId)
      .eq("generation_key", generationKey)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing && !replaceExisting) {
      return NextResponse.json(
        {
          error: "A quiz already exists for this video. Replace it to generate a new set.",
          code: "QUIZ_EXISTS",
          existingArtifactId: existing.id,
          existingTitle: existing.title,
        },
        { status: 409 },
      );
    }
    existingQuizId = existing?.id ?? null;

    // Also catch legacy quizzes that only stored material_id in payload.
    if (!existingQuizId && boundMaterialId) {
      const { data: legacyQuizzes, error: legacyError } = await context.supabase
        .from("study_artifacts")
        .select("id,title,payload,created_at")
        .eq("user_id", context.user.id)
        .eq("study_space_id", studySpaceId)
        .eq("kind", "video_quiz")
        .order("created_at", { ascending: false })
        .limit(20);

      if (legacyError) {
        return NextResponse.json({ error: legacyError.message }, { status: 500 });
      }

      const legacyMatch = (legacyQuizzes ?? []).find((row) => {
        const payload =
          row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : null;
        return payload?.material_id === boundMaterialId;
      });

      if (legacyMatch && !replaceExisting) {
        return NextResponse.json(
          {
            error: "A quiz already exists for this video. Replace it to generate a new set.",
            code: "QUIZ_EXISTS",
            existingArtifactId: legacyMatch.id,
            existingTitle: legacyMatch.title,
          },
          { status: 409 },
        );
      }
      existingQuizId = legacyMatch?.id ?? existingQuizId;
    }
  }

  let chunks: Array<
    Pick<
      MaterialChunk,
      | "id"
      | "material_id"
      | "content"
      | "page_number"
      | "start_seconds"
      | "end_seconds"
      | "chunk_index"
    >
  > = [];

  if (materialIds.length > 0) {
    const { data: materialChunks, error: chunkError } = await context.supabase
      .from("material_chunks")
      .select("id,material_id,content,page_number,start_seconds,end_seconds,chunk_index")
      .eq("user_id", context.user.id)
      .eq("study_space_id", studySpaceId)
      .in("material_id", materialIds)
      .order("chunk_index", { ascending: true })
      .limit(40);

    if (chunkError) {
      return NextResponse.json({ error: chunkError.message }, { status: 500 });
    }
    chunks = materialChunks ?? [];
  }

  if (requiresIndexedVideo && chunks.length === 0) {
    return NextResponse.json(
      { error: "Your ready material does not have indexed excerpts yet." },
      { status: 400 },
    );
  }

  if (
    kind === "video_create" &&
    chunks.length === 0 &&
    !brief &&
    !youtubeUrl
  ) {
    return NextResponse.json(
      {
        error:
          "Add a lesson brief, paste a YouTube URL, or index material in Library.",
      },
      { status: 400 },
    );
  }

  const materialNames = new Map(
    materialResult.materials.map((material) => [material.id, material.name]),
  );
  const contextChunks = chunks.map((chunk) => ({
    ...chunk,
    material_name: materialNames.get(chunk.material_id) ?? "Study material",
  })) as SourceChunk[];

  let payload;
  try {
    const quizChunks =
      kind === "video_quiz" ? sampleChunksEvenly(contextChunks, 12) : contextChunks;
    const contextForPrompt =
      kind === "video_quiz"
        ? sourceContext(quizChunks, { maxChunks: 12, maxCharsPerChunk: 550 })
        : sourceContext(contextChunks);
    const raw = await generateGroqText({
      system:
        "You create source-grounded learning tools for LearnSphere. " +
        (kind === "video_create"
          ? "Follow the user's video brief and use supplied excerpts only when available. "
          : "Use only the provided excerpts, keep every question answerable from them. ") +
        (kind === "video_quiz"
          ? "Prefer conceptual understanding over caption trivia. "
          : "") +
        "Return valid JSON with no markdown.",
      messages: [
        {
          role: "user",
          content:
            "STUDY SPACE: " +
            space.name +
            "\n\n" +
            studyToolPrompt(
              kind,
              contextForPrompt,
              brief,
              languageCode,
              boundMaterialId,
            ),
        },
      ],
      maxTokens: kind === "video_quiz" ? 2500 : 2800,
    });
    payload = parseGeneratedStudyArtifact(kind, raw, { materialId: boundMaterialId });
    if (
      (kind === "video_quiz" || kind === "video_engage") &&
      (!("material_id" in payload) || !materialIds.includes(payload.material_id))
    ) {
      throw new Error("The generated video tool selected an invalid material.");
    }
  } catch (error) {
    if (error instanceof GroqRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json(
      { error: "The study tool could not be generated: " + message },
      { status: 502 },
    );
  }

  const materialLabel =
    youtubeVideoTitle ??
    (boundMaterialId ? materialNames.get(boundMaterialId) : null) ??
    null;
  const savedTitle = materialLabel
    ? artifactTitle(kind) + ": " + materialLabel.slice(0, 80)
    : artifactTitle(kind);

  const row = {
    user_id: context.user.id,
    study_space_id: studySpaceId,
    kind,
    title: savedTitle,
    payload: jsonValue(payload),
    material_id: boundMaterialId ?? null,
    generation_key: generationKey,
  };

  let artifact: StudyArtifact | null = null;

  if (existingQuizId && kind === "video_quiz") {
    // Remove sibling legacy duplicates for the same video, then update the kept row.
    if (boundMaterialId) {
      const { data: siblings } = await context.supabase
        .from("study_artifacts")
        .select("id,payload,material_id")
        .eq("user_id", context.user.id)
        .eq("study_space_id", studySpaceId)
        .eq("kind", "video_quiz");

      const duplicateIds = (siblings ?? [])
        .filter((sibling) => {
          if (sibling.id === existingQuizId) return false;
          if (sibling.material_id === boundMaterialId) return true;
          const siblingPayload =
            sibling.payload &&
            typeof sibling.payload === "object" &&
            !Array.isArray(sibling.payload)
              ? (sibling.payload as Record<string, unknown>)
              : null;
          return siblingPayload?.material_id === boundMaterialId;
        })
        .map((sibling) => sibling.id);

      if (duplicateIds.length > 0) {
        await context.supabase.from("study_artifacts").delete().in("id", duplicateIds);
      }
    }

    const { data: updated, error: updateError } = await context.supabase
      .from("study_artifacts")
      .update(row)
      .eq("id", existingQuizId)
      .eq("user_id", context.user.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "The study tool could not be updated." },
        { status: 500 },
      );
    }
    artifact = updated as StudyArtifact;
  } else {
    const { data: inserted, error: insertError } = await context.supabase
      .from("study_artifacts")
      .insert(row)
      .select("*")
      .single();

    if (insertError || !inserted) {
      if (insertError?.code === "23505" && kind === "video_quiz") {
        return NextResponse.json(
          {
            error: "A quiz already exists for this video. Replace it to generate a new set.",
            code: "QUIZ_EXISTS",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: insertError?.message ?? "The study tool could not be saved." },
        { status: 500 },
      );
    }
    artifact = inserted as StudyArtifact;
  }

  await recordActivityFailOpen(context.supabase, {
    userId: context.user.id,
    eventType: "study_tool_generated",
    timeZone: readTimezoneFromRequest(request),
    idempotencyKey: `study_tool_generated:${artifact.id}:${Date.now()}`,
    metadata: { artifactId: artifact.id, kind },
  });

  return NextResponse.json({
    artifact: hideQuizAnswers(artifact),
  });
}
