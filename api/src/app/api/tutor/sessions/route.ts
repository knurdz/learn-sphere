import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/server";

const sessionSchema = z.object({
  studySpaceId: z.string().uuid(),
});

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

  const body = await request.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid study space." }, { status: 400 });
  }

  const { data: studySpace } = await context.supabase
    .from("study_spaces")
    .select("id")
    .eq("id", parsed.data.studySpaceId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!studySpace) {
    return NextResponse.json({ error: "Study space not found." }, { status: 404 });
  }

  const { data, error } = await context.supabase
    .from("chat_sessions")
    .insert({
      user_id: context.user.id,
      study_space_id: studySpace.id,
      title: "New tutor session",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
