import { NextResponse } from "next/server";
import { studySpaceInputSchema } from "@/lib/validation";
import { getAuthContext } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = studySpaceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid study space." },
      { status: 400 },
    );
  }

  const { data, error } = await context.supabase
    .from("study_spaces")
    .insert({
      user_id: context.user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create the study space." },
      { status: 500 },
    );
  }

  return NextResponse.json({ studySpace: data }, { status: 201 });
}
