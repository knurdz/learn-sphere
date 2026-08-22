import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(request);
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await params;
  const { data: session } = await context.supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Tutor session not found." }, { status: 404 });
  }

  const { error } = await context.supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
