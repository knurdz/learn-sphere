import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGamificationRow } from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

const bodySchema = z.object({
  dailyGoal: z.number().int().min(1).max(50),
});

export async function PATCH(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a daily goal between 1 and 50." }, { status: 400 });
  }

  try {
    await ensureGamificationRow(context.supabase, context.user.id);
    const { data, error } = await context.supabase
      .from("user_gamification")
      .update({
        daily_goal: parsed.data.dailyGoal,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.user.id)
      .select("daily_goal")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Could not update the daily goal." }, { status: 500 });
    }

    return NextResponse.json({ dailyGoal: data.daily_goal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the daily goal." },
      { status: 500 },
    );
  }
}
