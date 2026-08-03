import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/server";
import type { LearningFeedKind } from "@/lib/supabase/database";

const progressSchema = z.object({
  completed: z.boolean().default(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a valid completion state." }, { status: 400 });
  }

  const { id } = await params;
  const { data: artifact, error: artifactError } = await context.supabase
    .from("study_artifacts")
    .select("id,study_space_id,kind")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }
  if (!artifact) {
    return NextResponse.json({ error: "Learning item not found." }, { status: 404 });
  }
  if (!["meme", "flashcard", "did_you_know"].includes(artifact.kind as LearningFeedKind)) {
    return NextResponse.json({ error: "Use answer submission for this learning item." }, { status: 400 });
  }

  const { data: existing } = await context.supabase
    .from("learning_progress")
    .select("last_score")
    .eq("artifact_id", artifact.id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  const completedAt = parsed.data.completed ? new Date().toISOString() : null;
  const { data: progress, error: progressError } = await context.supabase
    .from("learning_progress")
    .upsert(
      {
        user_id: context.user.id,
        study_space_id: artifact.study_space_id,
        artifact_id: artifact.id,
        item_type: artifact.kind,
        completed_at: completedAt,
        last_score: existing?.last_score ?? null,
      },
      { onConflict: "user_id,artifact_id" },
    )
    .select("completed_at,last_score")
    .single();

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  return NextResponse.json({
    progress: {
      completedAt: progress.completed_at,
      lastScore: progress.last_score,
    },
  });
}
