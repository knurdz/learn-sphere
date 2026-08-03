import { NextResponse } from "next/server";
import { z } from "zod";
import {
  learningFeedKinds,
  scoreLearningAttempt,
} from "@/lib/learning-feed";
import { jsonValue } from "@/lib/study-tools";
import { getAuthContext } from "@/lib/supabase/server";
import type { LearningFeedKind } from "@/lib/supabase/database";

const requestSchema = z.object({
  answer: z.unknown(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Submit one answer." }, { status: 400 });
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
    return NextResponse.json({ error: "Learning item not found." }, { status: 404 });
  }
  if (!learningFeedKinds.includes(artifact.kind as LearningFeedKind)) {
    return NextResponse.json({ error: "This item does not accept an attempt." }, { status: 400 });
  }

  let result;
  try {
    result = scoreLearningAttempt(
      artifact.kind as LearningFeedKind,
      artifact.payload,
      parsed.data.answer,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That answer is invalid." },
      { status: 400 },
    );
  }

  const { data: attempt, error: attemptError } = await context.supabase
    .from("study_attempts")
    .insert({
      user_id: context.user.id,
      artifact_id: artifact.id,
      score: result.score,
      answers: jsonValue({ answer: parsed.data.answer }),
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

  return NextResponse.json({ attempt, ...result });
}
