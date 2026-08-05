import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
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
    .select("storage_path,mime_type")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const { data, error } = await context.supabase.storage
    .from("materials")
    .createSignedUrl(material.storage_path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create a signed URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    mimeType: material.mime_type,
  });
}
