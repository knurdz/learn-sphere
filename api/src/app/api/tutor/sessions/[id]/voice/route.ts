import { NextResponse } from "next/server";
import { answerTutorQuestion } from "@/lib/tutor";
import { resolveAppLanguage } from "@/lib/app-language";
import { transcribeFile } from "@/lib/providers/groq";
import { getAuthContext } from "@/lib/supabase/server";
import { isWhisperSilenceHallucination } from "@/lib/voice-transcription";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
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
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Tutor session not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Record a voice question first." }, { status: 400 });
  }

  if (audio.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Voice questions must be under 10 MB." }, { status: 400 });
  }

  const languageCode = resolveAppLanguage(request);

  const mimeType =
    audio.type && audio.type !== "application/octet-stream"
      ? audio.type
      : audio.name.endsWith(".m4a")
        ? "audio/mp4"
        : "audio/webm";
  const fileName = audio.name || (mimeType === "audio/mp4" ? "voice-question.m4a" : "voice-question.webm");

  const transcriptSegments = await transcribeFile({
    buffer: Buffer.from(await audio.arrayBuffer()),
    fileName,
    mimeType,
    language: languageCode,
  });
  const question = transcriptSegments.map((segment) => segment.text).join(" ").trim();

  if (!question || isWhisperSilenceHallucination(question, audio.size)) {
    return NextResponse.json({ error: "No speech was detected." }, { status: 422 });
  }

  const { data: history } = await context.supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", id)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: userMessage, error: userMessageError } = await context.supabase
    .from("chat_messages")
    .insert({
      session_id: id,
      user_id: context.user.id,
      role: "user",
      content: question,
      citations: [],
    })
    .select()
    .single();

  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 });
  }

  try {
    const answer = await answerTutorQuestion(context.supabase, {
      userId: context.user.id,
      studySpaceId: session.study_space_id,
      question,
      languageCode,
      history: (history || [])
        .reverse()
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    });

    const { data: assistantMessage, error: assistantError } =
      await context.supabase
        .from("chat_messages")
        .insert({
          session_id: id,
          user_id: context.user.id,
          role: "assistant",
          content: answer.answer,
          citations: answer.citations,
        })
        .select()
        .single();

    if (assistantError) {
      throw new Error(assistantError.message);
    }

    return NextResponse.json({
      transcript: question,
      userMessage,
      assistantMessage,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "The tutor could not answer right now.",
      },
      { status: 502 },
    );
  }
}
