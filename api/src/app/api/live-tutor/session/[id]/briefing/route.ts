import { NextResponse } from "next/server";
import { getLiveSessionBriefing } from "@/lib/live-tutor";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(request);
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user || !context.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const { data: session } = await context.supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Live tutor session not found." }, { status: 404 });
  }

  const briefing = await getLiveSessionBriefing(context.supabase, sessionId);
  if (!briefing) {
    return NextResponse.json({ error: "Live tutor session not found." }, { status: 404 });
  }

  return NextResponse.json({
    instructions: briefing.instructions,
    greeting: briefing.greeting,
    studySpaceId: briefing.studySpaceId,
    spaceName: briefing.spaceName,
    locale: briefing.locale,
  });
}
