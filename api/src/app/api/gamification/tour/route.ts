import { NextResponse } from "next/server";
import { z } from "zod";
import {
  COACH_TOUR_STEPS,
  completeCoachTourStep,
  skipCoachTour,
} from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

const bodySchema = z.union([
  z.object({ stepId: z.enum(COACH_TOUR_STEPS) }),
  z.object({ skip: z.literal(true) }),
]);

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
    return NextResponse.json({ error: "Send a tour step id or skip: true." }, { status: 400 });
  }

  try {
    const coachTour =
      "skip" in parsed.data
        ? await skipCoachTour(context.supabase, context.user.id)
        : await completeCoachTourStep(
            context.supabase,
            context.user.id,
            parsed.data.stepId,
          );
    return NextResponse.json({ coachTour });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update tour progress." },
      { status: 500 },
    );
  }
}
