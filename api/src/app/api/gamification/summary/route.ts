import { NextResponse } from "next/server";
import {
  fetchGamificationSummary,
  readTimezoneFromRequest,
} from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const timeZone = readTimezoneFromRequest(request);

  const [{ data: studySpaces, error: spacesError }, { data: materials, error: materialsError }] =
    await Promise.all([
      context.supabase.from("study_spaces").select("*").eq("user_id", context.user.id),
      context.supabase.from("materials").select("*").eq("user_id", context.user.id),
    ]);

  if (spacesError) {
    return NextResponse.json({ error: spacesError.message }, { status: 500 });
  }
  if (materialsError) {
    return NextResponse.json({ error: materialsError.message }, { status: 500 });
  }

  try {
    const summary = await fetchGamificationSummary(
      context.supabase,
      context.user.id,
      timeZone,
      studySpaces ?? [],
      materials ?? [],
    );
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load gamification summary." },
      { status: 500 },
    );
  }
}
