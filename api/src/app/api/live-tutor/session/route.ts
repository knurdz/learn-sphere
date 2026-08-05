import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildTeachingInstructions,
  cacheLiveSession,
  clearLiveSession,
  greetingForMode,
  type LiveTutorMode,
} from "@/lib/live-tutor";
import {
  getAppLanguageDefinition,
  liveVoiceErrorMessage,
  resolveAppLanguage,
} from "@/lib/app-language";
import { createLearnerToken, livekitConfigured } from "@/lib/providers/livekit";
import { recordActivityFailOpen, readTimezoneFromRequest } from "@/lib/gamification";
import { getAuthContext, getBearerToken } from "@/lib/supabase/server";

const schema = z.object({
  studySpaceId: z.string().uuid(),
  mode: z.enum(["tutor", "video_create", "video_engage", "youtube_tutor"]).default("tutor"),
  brief: z.string().trim().max(1500).optional(),
  youtubeUrl: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user || !context.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!livekitConfigured()) {
    return NextResponse.json(
      {
        error:
          "LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to api/.env.local " +
          "(from https://cloud.livekit.io → your project → Settings → Keys), then restart the API with pnpm dev.",
      },
      { status: 503 },
    );
  }

  const supabaseAccessToken = getBearerToken(request);
  if (!supabaseAccessToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid study space and session type." }, { status: 400 });
  }

  const mode = parsed.data.mode as LiveTutorMode;
  const brief = parsed.data.brief || "";
  const youtubeUrl = parsed.data.youtubeUrl || "";
  const locale = resolveAppLanguage(request);
  const liveVoiceError = liveVoiceErrorMessage(locale);
  if (liveVoiceError) {
    return NextResponse.json({ error: liveVoiceError }, { status: 400 });
  }

  try {
    const { data: space } = await context.supabase
      .from("study_spaces")
      .select("id,name")
      .eq("id", parsed.data.studySpaceId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (!space) {
      return NextResponse.json({ error: "Study space not found." }, { status: 404 });
    }

    const instructions = await buildTeachingInstructions(
      context.supabase,
      context.user.id,
      parsed.data.studySpaceId,
      mode,
      brief,
      youtubeUrl,
      locale,
    );

    const { data: session, error } = await context.supabase
      .from("chat_sessions")
      .insert({
        user_id: context.user.id,
        study_space_id: space.id,
        title: "Live tutor session",
        locale,
      })
      .select("id")
      .single();

    if (error || !session) {
      return NextResponse.json({ error: error?.message || "Could not start session." }, { status: 500 });
    }

    const greeting = greetingForMode(mode, locale);
    cacheLiveSession(session.id, {
      instructions: `Study space: ${space.name}\n\n${instructions}`,
      greeting,
      studySpaceId: space.id,
      userId: context.user.id,
      mode,
      brief,
      youtubeUrl,
      spaceName: space.name,
      locale,
    });

    const languageDef = getAppLanguageDefinition(locale);
    const livekit = await createLearnerToken({
      sessionId: session.id,
      userId: context.user.id,
      displayName: context.user.email || "Learner",
      supabaseAccessToken,
      locale,
      sttLanguage: languageDef.sttLanguage,
      ttsModel: languageDef.ttsModel,
      ttsVoice: languageDef.ttsVoice,
      ttsLanguage: languageDef.ttsLanguage,
    });

    await recordActivityFailOpen(context.supabase, {
      userId: context.user.id,
      eventType: "live_tutor_started",
      timeZone: readTimezoneFromRequest(request),
      idempotencyKey: `live_tutor_started:${session.id}`,
      metadata: { sessionId: session.id, mode },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        greeting,
        mode,
        url: livekit.url,
        room: livekit.room,
        token: livekit.token,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live tutor is unavailable." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const context = await getAuthContext(request);
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (sessionId) clearLiveSession(sessionId);
  return NextResponse.json({ ok: true });
}
