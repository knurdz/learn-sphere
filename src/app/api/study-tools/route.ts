import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClaudeText } from "@/lib/providers/anthropic";
import {
  artifactTitle,
  hideQuizAnswers,
  jsonValue,
  parseGeneratedStudyArtifact,
  studyToolPrompt,
} from "@/lib/study-tools";
import type {
  MaterialChunk,
  LearningProgress,
  StudyArtifact,
  StudyArtifactKind,
} from "@/lib/supabase/database";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  studySpaceId: z.string().uuid(),
  kind: z.enum(["guide", "flashcards", "practice_test", "video_quiz"]),
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

function sourceContext(chunks: SourceChunk[]) {
  return chunks
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
        chunk.content.slice(0, 1100)
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
    kind === "video_quiz"
      ? readyMaterials.filter((material) => material.mime_type.startsWith("video/"))
      : readyMaterials;

  return { materials: selectedMaterials, error: null };
}

export async function GET(request: NextRequest) {
  const context = await getAuthContext();

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
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: progress } = await context.supabase
    .from("learning_progress")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("study_space_id", studySpaceId);

  try {
    return NextResponse.json({
      artifacts: (artifacts ?? []).map((artifact) =>
        hideQuizAnswers(artifact as StudyArtifact),
      ),
      progress: (progress ?? []) as LearningProgress[],
    });
  } catch {
    return NextResponse.json(
      { error: "A saved study tool has invalid generated data." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const context = await getAuthContext();

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

  const materialResult = await getStudySpaceMaterials(
    context.user.id,
    studySpaceId,
    kind,
    context.supabase,
  );

  if (materialResult.error) {
    return NextResponse.json({ error: materialResult.error }, { status: 500 });
  }
  if (materialResult.materials.length === 0) {
    return NextResponse.json(
      {
        error:
          kind === "video_quiz"
            ? "Index at least one ready video before creating a video quiz."
            : "Index at least one material before creating a study tool.",
      },
      { status: 400 },
    );
  }

  const materialIds = materialResult.materials.map((material) => material.id);
  const { data: chunks, error: chunkError } = await context.supabase
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
  if (!chunks || chunks.length === 0) {
    return NextResponse.json(
      { error: "Your ready material does not have indexed excerpts yet." },
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
    const raw = await generateClaudeText({
      system:
        "You create source-grounded learning tools for LearnSphere. " +
        "Use only the provided excerpts, keep every question answerable from them, " +
        "and return valid JSON with no markdown.",
      messages: [
        {
          role: "user",
          content:
            "STUDY SPACE: " +
            space.name +
            "\n\n" +
            studyToolPrompt(kind, sourceContext(contextChunks)),
        },
      ],
      maxTokens: kind === "guide" ? 2000 : 2800,
    });
    payload = parseGeneratedStudyArtifact(kind, raw);
    if (
      kind === "video_quiz" &&
      (!("material_id" in payload) || !materialIds.includes(payload.material_id))
    ) {
      throw new Error("The generated video quiz selected an invalid material.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json(
      { error: "The study tool could not be generated: " + message },
      { status: 502 },
    );
  }

  const { data: artifact, error: insertError } = await context.supabase
    .from("study_artifacts")
    .insert({
      user_id: context.user.id,
      study_space_id: studySpaceId,
      kind,
      title: artifactTitle(kind),
      payload: jsonValue(payload),
    })
    .select("*")
    .single();

  if (insertError || !artifact) {
    return NextResponse.json(
      { error: insertError?.message ?? "The study tool could not be saved." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    artifact: hideQuizAnswers(artifact as StudyArtifact),
  });
}
