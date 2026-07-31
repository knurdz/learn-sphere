import { NextResponse } from "next/server";
import { z } from "zod";
import { answerTutorQuestion } from "@/lib/tutor";
import { getAuthContext } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/supabase/database";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Ask a question first.").max(4000),
});

async function getSession(
  context: Awaited<ReturnType<typeof getAuthContext>>,
  id: string,
) {
  if (!context.configured || !context.user) {
    return null;
  }

  const { data } = await context.supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();
  return data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await params;
  const session = await getSession(context, id);
  if (!session) {
    return NextResponse.json({ error: "Tutor session not found." }, { status: 404 });
  }

  const { data, error } = await context.supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await params;
  const session = await getSession(context, id);
  if (!session) {
    return NextResponse.json({ error: "Tutor session not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid question." },
      { status: 400 },
    );
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
      content: parsed.data.content,
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
      question: parsed.data.content,
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

    await context.supabase
      .from("chat_sessions")
      .update({
        title:
          session.title === "New tutor session"
            ? parsed.data.content.slice(0, 70)
            : session.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", context.user.id);

    return NextResponse.json({
      userMessage,
      assistantMessage: assistantMessage as ChatMessage,
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
