import { NextResponse } from "next/server";
import { ingestMaterial } from "@/lib/ingestion";
import { getAuthContext } from "@/lib/supabase/server";
import type { Material } from "@/lib/supabase/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(_request);

  if (!context.configured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await params;
  const { data: material, error: materialError } = await context.supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (materialError || !material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const typedMaterial = material as Material;
  if (typedMaterial.status === "processing") {
    return NextResponse.json(
      { error: "This material is already being indexed." },
      { status: 409 },
    );
  }

  if (!["uploaded", "ready", "error"].includes(typedMaterial.status)) {
    return NextResponse.json(
      { error: "Upload the material before indexing it." },
      { status: 400 },
    );
  }

  await context.supabase
    .from("materials")
    .update({
      status: "processing",
      ingestion_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.user.id);

  try {
    const result = await ingestMaterial(context.supabase, typedMaterial);
    const { data: updatedMaterial, error: updateError } = await context.supabase
      .from("materials")
      .update({
        status: "ready",
        ingestion_error: null,
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", context.user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      material: updatedMaterial,
      chunkCount: result.chunkCount,
    });
  } catch (caughtError) {
    const errorMessage =
      caughtError instanceof Error
        ? caughtError.message
        : "The material could not be indexed.";

    await context.supabase
      .from("materials")
      .update({
        status: "error",
        ingestion_error: errorMessage.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", context.user.id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
