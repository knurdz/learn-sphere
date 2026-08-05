import { NextResponse } from "next/server";
import { buildMaterialStoragePath } from "@/lib/materials";
import { materialInputSchema } from "@/lib/validation";
import { recordActivityFailOpen, readTimezoneFromRequest } from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = materialInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid material." },
      { status: 400 },
    );
  }

  const { data: studySpace, error: studySpaceError } = await context.supabase
    .from("study_spaces")
    .select("id")
    .eq("id", parsed.data.studySpaceId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (studySpaceError || !studySpace) {
    return NextResponse.json(
      { error: "That study space does not exist." },
      { status: 404 },
    );
  }

  const materialId = crypto.randomUUID();
  const storagePath = buildMaterialStoragePath(
    context.user.id,
    materialId,
    parsed.data.name,
  );

  const { data, error } = await context.supabase
    .from("materials")
    .insert({
      id: materialId,
      user_id: context.user.id,
      study_space_id: studySpace.id,
      name: parsed.data.name,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.size,
      storage_path: storagePath,
      status: "created",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create the material record." },
      { status: 500 },
    );
  }

  await recordActivityFailOpen(context.supabase, {
    userId: context.user.id,
    eventType: "material_uploaded",
    timeZone: readTimezoneFromRequest(request),
    idempotencyKey: `material_uploaded:${materialId}`,
    metadata: { materialId },
  });

  return NextResponse.json(
    { material: data, materialId, storagePath },
    { status: 201 },
  );
}
