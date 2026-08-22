import { NextResponse } from "next/server";
import { resolveAppLanguage } from "@/lib/app-language";
import { transcribeFile } from "@/lib/providers/groq";
import { getAuthContext } from "@/lib/supabase/server";
import { isWhisperSilenceHallucination } from "@/lib/voice-transcription";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getAuthContext(request);
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
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
  const transcript = transcriptSegments.map((segment) => segment.text).join(" ").trim();

  if (!transcript || isWhisperSilenceHallucination(transcript, audio.size)) {
    return NextResponse.json({ error: "No speech was detected." }, { status: 422 });
  }

  return NextResponse.json({ transcript });
}
