import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  const { data: material, error: materialError } = await context.supabase
    .from("materials")
    .select("id,storage_path")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const { data: artifacts, error: artifactReadError } = await context.supabase
    .from("study_artifacts")
    .select("id,asset_path")
    .eq("user_id", context.user.id)
    .eq("material_id", id);

  if (artifactReadError) {
    return NextResponse.json({ error: artifactReadError.message }, { status: 500 });
  }

  const artifactIds = (artifacts ?? []).map((artifact) => artifact.id);
  const assetPaths = (artifacts ?? [])
    .map((artifact) => artifact.asset_path)
    .filter((path): path is string => Boolean(path));

  if (artifactIds.length > 0) {
    await context.supabase
      .from("learning_progress")
      .delete()
      .eq("user_id", context.user.id)
      .in("artifact_id", artifactIds);
    await context.supabase
      .from("study_attempts")
      .delete()
      .eq("user_id", context.user.id)
      .in("artifact_id", artifactIds);
  }

  await context.supabase
    .from("study_artifacts")
    .delete()
    .eq("user_id", context.user.id)
    .eq("material_id", id);
  await context.supabase
    .from("learning_atoms")
    .delete()
    .eq("user_id", context.user.id)
    .eq("material_id", id);
  await context.supabase
    .from("material_chunks")
    .delete()
    .eq("user_id", context.user.id)
    .eq("material_id", id);

  if (assetPaths.length > 0) {
    await context.supabase.storage.from("learning-assets").remove(assetPaths);
  }
  await context.supabase.storage.from("materials").remove([material.storage_path]);

  const { error: materialDeleteError } = await context.supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id);

  if (materialDeleteError) {
    return NextResponse.json({ error: materialDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
