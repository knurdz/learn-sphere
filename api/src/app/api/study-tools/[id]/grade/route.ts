import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  gradeQuizQuestion,
  parseStudyArtifactPayload,
} from "@/lib/study-tools";
import { getAuthContext } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  questionId: z.string().min(1),
  answer: z.number().int().nonnegative(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Submit a questionId and numeric answer." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { data: artifact, error: artifactError } = await context.supabase
    .from("study_artifacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }
  if (!artifact) {
    return NextResponse.json({ error: "Study tool not found." }, { status: 404 });
  }
  if (artifact.kind !== "video_quiz") {
    return NextResponse.json({ error: "This study tool cannot be graded." }, { status: 400 });
  }

  try {
    const payload = parseStudyArtifactPayload(artifact.kind, artifact.payload);
    if (!("questions" in payload)) {
      throw new Error("Invalid quiz kind.");
    }
    const feedback = gradeQuizQuestion(
      payload,
      parsedBody.data.questionId,
      parsedBody.data.answer,
    );
    return NextResponse.json(feedback);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grade question.";
    if (message === "Question not found." || message === "Answer index is out of range.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "This quiz has invalid generated data." }, { status: 500 });
  }
}
