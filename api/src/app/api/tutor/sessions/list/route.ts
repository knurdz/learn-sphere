import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/server";

const querySchema = z.object({
  studySpaceId: z.string().uuid(),
});

export async function GET(request: Request) {
  const context = await getAuthContext(request);
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    studySpaceId: url.searchParams.get("studySpaceId"),
  });
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

  const { data: sessions, error: sessionError } = await context.supabase
    .from("chat_sessions")
    .select("id, title, updated_at, created_at")
    .eq("user_id", context.user.id)
    .eq("study_space_id", studySpace.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const sessionIds = (sessions || []).map((session) => session.id);
  if (sessionIds.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const { data: messages, error: messageError } = await context.supabase
    .from("chat_messages")
    .select("session_id, role, content, created_at")
    .eq("user_id", context.user.id)
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });
  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const previewBySession = new Map<
    string,
    {
      preview: string;
      messageCount: number;
    }
  >();

  for (const message of messages || []) {
    const current = previewBySession.get(message.session_id);
    if (!current) {
      const prefix = message.role === "assistant" ? "Tutor: " : "You: ";
      previewBySession.set(message.session_id, {
        preview: (prefix + message.content).slice(0, 140),
        messageCount: 1,
      });
      continue;
    }
    previewBySession.set(message.session_id, {
      ...current,
      messageCount: current.messageCount + 1,
    });
  }

  return NextResponse.json({
    sessions: (sessions || []).map((session) => {
      const previewMeta = previewBySession.get(session.id);
      return {
        id: session.id,
        title: session.title || "New tutor session",
        updatedAt: session.updated_at || session.created_at,
        preview: previewMeta?.preview || "",
        messageCount: previewMeta?.messageCount || 0,
      };
    }),
  });
}
