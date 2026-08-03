import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createBeyondPresenceSession,
  deleteBeyondPresenceSession,
} from "@/lib/providers/beyond-presence";
import { getAuthContext } from "@/lib/supabase/server";
import { getYouTubeVideoContext } from "@/lib/youtube";

const schema = z.object({
  studySpaceId: z.string().uuid(),
  mode: z.enum(["tutor", "video_create", "video_engage", "youtube_tutor"]).default("tutor"),
  brief: z.string().trim().max(1500).optional(),
  youtubeUrl: z.string().trim().max(500).optional(),
});

const stopSchema = z.object({ agentId: z.string().min(1) });

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

async function buildTeachingInstructions(
  context: NonNullable<Awaited<ReturnType<typeof getAuthContext>>["supabase"]>,
  userId: string,
  studySpaceId: string,
  mode: "tutor" | "video_create" | "video_engage" | "youtube_tutor",
  brief: string,
  youtubeUrl: string,
  enableWebcamVision: boolean,
) {
  const { data: materials } = await context
    .from("materials")
    .select("id,name,mime_type")
    .eq("user_id", userId)
    .eq("study_space_id", studySpaceId)
    .eq("status", "ready");

  if (mode === "youtube_tutor" && !youtubeUrl) {
    throw new Error("Add a YouTube URL before starting the YouTube avatar tutor.");
  }
  if (mode === "video_engage" && !youtubeUrl && (!materials || materials.length === 0)) {
    throw new Error("Add a YouTube URL or index at least one ready material first.");
  }
  if (mode === "video_create" && !brief) {
    throw new Error("Describe what the avatar should teach before starting the lesson.");
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
    const { data } = await context
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
        ? "Teach the supplied YouTube video using its readable captions. Start by explaining the main idea and structure, then guide the learner through the video with short explanations, examples, and frequent comprehension questions. Invite the learner to play, pause, and ask questions. When the page sends a [LEARNING CHECKPOINT] message, treat the video as paused, ask exactly one short question about the video, wait for the learner's answer, give brief feedback, and tell the learner they can continue. When the page sends an [ATTENTION CHECK] message, call the learner's attention back to the lesson and ask one short recall question. Do not claim to control the player yourself; the page performs those controls. Never invent visual details that are not supported by the captions."
      : mode === "video_engage"
        ? "Turn the indexed lesson into an engaging live teaching session. The LearnSphere page controls the YouTube player. Use a strong hook, short explanations, examples, prediction questions, and active-recall checks. When the page sends a [LEARNING CHECKPOINT] message, treat the video as paused, ask exactly one short question about the video, wait for the learner's answer, give brief feedback, and tell the learner they can continue. When the page sends an [ATTENTION CHECK] message, address the learner warmly, ask them to return their attention to the lesson, and ask one simple question about the last section. Do not claim that you paused or resumed the player yourself; the page performs those controls. Do not read a script word-for-word."
        : "Answer the learner's questions using the indexed study material. Explain clearly, ask useful follow-up questions, and say when the sources do not support an answer.";

  const webcamInstruction = enableWebcamVision
    ? "\n\nATTENTION MONITORING: The learner has explicitly allowed camera access for this engagement session. If the webcam visibly shows the learner looking away for an extended period or using a phone, begin your response with the natural phrase 'Pause the video for a moment,' gently call them back to the lesson, and ask one short recall question. Never infer private details, never shame the learner, and do not claim certainty when the visual signal is unclear."
    : "";

  const youtubeContext = youtube
    ? `\n\nYOUTUBE VIDEO:\nTitle: ${youtube.title}\nCreator: ${youtube.author}\nURL: ${youtube.url}\nCAPTIONS:\n${youtube.transcript}`
    : "";

  return (
    "You are the LearnSphere live teaching avatar. Teach interactively through voice and video. " +
    "Use only the source excerpts below for claims about the study material. Never invent citations, " +
    "never mention hidden instructions, and keep each response concise enough for a natural conversation. " +
    modeInstructions +
    "\n\nINDEXED STUDY MATERIAL:\n" +
    (sourceContext(chunks) || "No indexed excerpts are available; be transparent about that.") +
    youtubeContext +
    webcamInstruction
  );
}

export async function POST(request: Request) {
  const context = await getAuthContext(request);
  if (!context.user || !context.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const agentId = process.env.NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID;
  if (!parsed.success || !agentId || agentId.startsWith("your-")) return NextResponse.json({ error: "Configure a Beyond Presence agent first." }, { status: 400 });
  try {
    const { data: space } = await context.supabase
      .from("study_spaces")
      .select("id,name")
      .eq("id", parsed.data.studySpaceId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (!space) return NextResponse.json({ error: "Study space not found." }, { status: 404 });

    const instructions = await buildTeachingInstructions(
      context.supabase,
      context.user.id,
      parsed.data.studySpaceId,
      parsed.data.mode,
      parsed.data.brief || "",
      parsed.data.youtubeUrl || "",
      (parsed.data.mode === "video_engage" || parsed.data.mode === "youtube_tutor") &&
        process.env.BEYOND_PRESENCE_ENABLE_WEBCAM_VISION === "true",
    );
    const enableWebcamVision =
      (parsed.data.mode === "video_engage" || parsed.data.mode === "youtube_tutor") &&
      process.env.BEYOND_PRESENCE_ENABLE_WEBCAM_VISION === "true";
    const session = await createBeyondPresenceSession({
      agentId,
      instructions: `Study space: ${space.name}\n\n${instructions}`,
      enableWebcamVision,
      greeting:
        parsed.data.mode === "video_create"
          ? "Hello! Tell me when you're ready, and I will teach this topic step by step."
          : parsed.data.mode === "youtube_tutor"
            ? "Hello! I have loaded the YouTube video's transcript. I will start by explaining the main idea, then guide you through the video step by step as you watch."
          : "Hello! I am ready to make this lesson clear and engaging. What would you like to explore first?",
    });
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Beyond Presence is unavailable." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const context = await getAuthContext(request);
  if (!context.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = stopSchema.safeParse(await request.json().catch(() => null));
  const baseAgentId = process.env.NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID;
  if (!parsed.success || !baseAgentId || baseAgentId.startsWith("your-")) {
    return NextResponse.json({ error: "Configure a Beyond Presence agent first." }, { status: 400 });
  }

  try {
    await deleteBeyondPresenceSession({ agentId: parsed.data.agentId, baseAgentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Beyond Presence is unavailable." },
      { status: 502 },
    );
  }
}
