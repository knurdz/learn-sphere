import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_FOREGROUND_DELTA_SECONDS, addForegroundSeconds } from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

const bodySchema = z.object({
  seconds: z.number().int().min(1).max(MAX_FOREGROUND_DELTA_SECONDS),
});

export async function POST(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Send seconds as an integer between 1 and ${MAX_FOREGROUND_DELTA_SECONDS}.` },
      { status: 400 },
    );
  }

  try {
    const foregroundSeconds = await addForegroundSeconds(
      context.supabase,
      context.user.id,
      parsed.data.seconds,
    );
    return NextResponse.json({ foregroundSeconds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record time spent." },
      { status: 500 },
    );
  }
}
