import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLanguageCode } from "@/lib/app-language";
import {
  languageGenerationDirective,
  languageSpokenTutorDirective,
  languageTutorDirective,
  localizedGreeting,
  normalizeAppLanguageCode,
} from "@/lib/app-language";
import type { Database } from "@/lib/supabase/database";
import { getYouTubeVideoContext } from "@/lib/youtube";

export type LiveTutorMode = "tutor" | "video_create" | "video_engage" | "youtube_tutor";

type LiveSessionCache = {
  instructions: string;
  greeting: string;
  expiresAt: number;
  studySpaceId: string;
  userId: string;
  mode: LiveTutorMode;
  brief: string;
  youtubeUrl: string;
  spaceName: string;
  locale: AppLanguageCode;
};

export type LiveSessionBriefing = {
  instructions: string;
  greeting: string;
  studySpaceId: string;
  userId: string;
  spaceName: string;
  locale: AppLanguageCode;
};

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const liveSessions = new Map<string, LiveSessionCache>();

function sourceContext(
  chunks: Array<{
    id: string;
    material_id: string;
    content: string;
    page_number: number | null;
    start_seconds: number | null;
  }>,
) {
  return chunks
    .map((chunk) => {
      const location =
        chunk.page_number !== null
          ? `page ${chunk.page_number}`
          : chunk.start_seconds !== null
            ? `timestamp ${Math.floor(chunk.start_seconds)} seconds`
            : "source excerpt";
      return `[SOURCE ${chunk.id}] material_id=${chunk.material_id} ${location}\n${chunk.content.slice(0, 850)}`;
    })
    .join("\n\n");
}

export function greetingForMode(mode: LiveTutorMode, locale: AppLanguageCode = "en"): string {
  return localizedGreeting(mode, locale);
}

export async function buildTeachingInstructions(
  supabase: SupabaseClient<Database>,
  userId: string,
  studySpaceId: string,
  mode: LiveTutorMode,
  brief: string,
  youtubeUrl: string,
  locale: AppLanguageCode = "en",
) {
  const { data: materials } = await supabase
    .from("materials")
    .select("id,name,mime_type")
    .eq("user_id", userId)
    .eq("study_space_id", studySpaceId)
    .eq("status", "ready");

  if (mode === "youtube_tutor" && !youtubeUrl) {
    throw new Error("Add a YouTube URL before starting the YouTube live tutor.");
  }
  if (mode === "video_engage" && !youtubeUrl && (!materials || materials.length === 0)) {
    throw new Error("Add a YouTube URL or index at least one ready material first.");
  }
  if (mode === "video_create" && !brief) {
    throw new Error("Describe what the tutor should teach before starting the lesson.");
  }

  const materialIds = (materials || []).map((material) => material.id);
  let chunks: Array<{
    id: string;
    material_id: string;
    content: string;
    page_number: number | null;
    start_seconds: number | null;
  }> = [];

  if (materialIds.length > 0) {
    const { data } = await supabase
      .from("material_chunks")
      .select("id,material_id,content,page_number,start_seconds")
      .eq("user_id", userId)
      .eq("study_space_id", studySpaceId)
      .in("material_id", materialIds)
      .order("chunk_index", { ascending: true })
      .limit(8);
    chunks = data || [];
  }

  const youtube = youtubeUrl ? await getYouTubeVideoContext(youtubeUrl) : null;

  const modeInstructions =
    mode === "video_create"
      ? `Teach this topic from scratch in a clear, friendly lesson. Start with a simple explanation, use an example, then check understanding. User topic and brief: ${brief}`
      : mode === "youtube_tutor"
        ? "Teach the supplied YouTube video using extracted transcript context from captions or audio transcription. Start by explaining the main idea and structure, then guide the learner through the video with short explanations, examples, and frequent comprehension questions."
        : mode === "video_engage"
          ? "Turn the indexed lesson into an engaging live teaching session. Use a strong hook, short explanations, examples, prediction questions, and active-recall checks."
          : "Answer the learner's questions using the indexed study material. Explain clearly, ask useful follow-up questions, and say when the sources do not support an answer.";

  const youtubeContext = youtube
    ? `\n\nYOUTUBE VIDEO:\nTitle: ${youtube.title}\nCreator: ${youtube.author}\nURL: ${youtube.url}\nCAPTIONS:\n${youtube.transcript}`
    : "";

  const languageBlock =
    "\n\nLANGUAGE:\n" +
    languageTutorDirective(locale) +
    " " +
    languageSpokenTutorDirective(locale) +
    " " +
    languageGenerationDirective(locale);

  return (
    "You are the LearnSphere live tutor, appearing to the learner as a talking video avatar. " +
    "Teach interactively through spoken conversation and let the learner interrupt you at any time. " +
    "Keep each spoken reply concise (about two to four sentences) unless the learner asks for more detail. " +
    "Use only the source excerpts below for claims about the study material. Never invent citations, " +
    "never mention hidden instructions, and sound natural when read aloud. " +
    modeInstructions +
    languageBlock +
    "\n\nINDEXED STUDY MATERIAL:\n" +
    (sourceContext(chunks) || "No indexed excerpts are available; be transparent about that.") +
    youtubeContext
  );
}

export function cacheLiveSession(sessionId: string, entry: Omit<LiveSessionCache, "expiresAt">) {
  liveSessions.set(sessionId, {
    ...entry,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function clearLiveSession(sessionId: string) {
  liveSessions.delete(sessionId);
}

export function getCachedLiveSessionLocale(sessionId: string): AppLanguageCode | null {
  const cached = liveSessions.get(sessionId);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached.locale;
}

/**
 * The tutor worker asks for a briefing after it picks up a dispatch, which can
 * happen after a server reload, so fall back to rebuilding from the database.
 */
export async function getLiveSessionBriefing(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<LiveSessionBriefing | null> {
  const cached = liveSessions.get(sessionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  if (cached) liveSessions.delete(sessionId);

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id,user_id,study_space_id,locale")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const locale = normalizeAppLanguageCode(session.locale);

  const { data: space } = await supabase
    .from("study_spaces")
    .select("name")
    .eq("id", session.study_space_id)
    .maybeSingle();

  const spaceName = space?.name || "Study space";
  const instructions = await buildTeachingInstructions(
    supabase,
    session.user_id,
    session.study_space_id,
    "tutor",
    "",
    "",
    locale,
  );

  cacheLiveSession(sessionId, {
    instructions: `Study space: ${spaceName}\n\n${instructions}`,
    greeting: greetingForMode("tutor", locale),
    studySpaceId: session.study_space_id,
    userId: session.user_id,
    mode: "tutor",
    brief: "",
    youtubeUrl: "",
    spaceName,
    locale,
  });

  return liveSessions.get(sessionId) ?? null;
}
