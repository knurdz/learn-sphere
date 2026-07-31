import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/server";

const statusSchema = z.enum(["uploaded", "upload_failed"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(
    typeof body === "object" && body !== null
      ? (body as { status?: unknown }).status
      : undefined,
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid material status." }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("materials")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update that material." },
      { status: 500 },
    );
  }

  return NextResponse.json({ material: data });
}
