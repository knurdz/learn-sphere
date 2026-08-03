import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  jsonValue,
  parseStudyArtifactPayload,
  quizResult,
} from "@/lib/study-tools";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  answers: z.record(z.string(), z.number().int().nonnegative()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Submit one numeric answer per question." }, { status: 400 });
  }

  const { id } = await params;
  const { data: artifact, error: artifactError } = await context.supabase
    .from("study_artifacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }
  if (!artifact) {
    return NextResponse.json({ error: "Study tool not found." }, { status: 404 });
  }
  if (artifact.kind !== "video_quiz") {
    return NextResponse.json({ error: "This study tool does not have an attempt." }, { status: 400 });
  }

  let result;
  try {
    const payload = parseStudyArtifactPayload(artifact.kind, artifact.payload);
    if (!("questions" in payload)) {
      throw new Error("Invalid quiz kind.");
    }
    result = quizResult(payload, parsedBody.data.answers);
  } catch {
    return NextResponse.json({ error: "This quiz has invalid generated data." }, { status: 500 });
  }

  const { data: attempt, error: attemptError } = await context.supabase
    .from("study_attempts")
    .insert({
      user_id: context.user.id,
      artifact_id: artifact.id,
      score: result.score,
      answers: jsonValue(parsedBody.data.answers),
    })
    .select("id,score,created_at")
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  const { error: progressError } = await context.supabase
    .from("learning_progress")
    .upsert(
      {
        user_id: context.user.id,
        study_space_id: artifact.study_space_id,
        artifact_id: artifact.id,
        item_type: artifact.kind,
        completed_at: new Date().toISOString(),
        last_score: result.score,
      },
      { onConflict: "user_id,artifact_id" },
    );

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt,
    ...result,
  });
}
