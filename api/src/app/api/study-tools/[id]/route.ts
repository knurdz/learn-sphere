import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

const deletableKinds = ["video_quiz", "video_create", "video_engage"] as const;

export async function DELETE(
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

  const { id } = await params;
  const { data: artifact, error: artifactError } = await context.supabase
    .from("study_artifacts")
    .select("id,kind,asset_path")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }
  if (!artifact) {
    return NextResponse.json({ error: "Study tool not found." }, { status: 404 });
  }
  if (!deletableKinds.includes(artifact.kind as (typeof deletableKinds)[number])) {
    return NextResponse.json({ error: "This study tool cannot be deleted here." }, { status: 400 });
  }

  await context.supabase
    .from("learning_progress")
    .delete()
    .eq("user_id", context.user.id)
    .eq("artifact_id", id);
  await context.supabase
    .from("study_attempts")
    .delete()
    .eq("user_id", context.user.id)
    .eq("artifact_id", id);

  if (artifact.asset_path) {
    await context.supabase.storage.from("learning-assets").remove([artifact.asset_path]);
  }

  const { error: deleteError } = await context.supabase
    .from("study_artifacts")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
