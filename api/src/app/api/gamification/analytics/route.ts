import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAnalytics,
  localDateKey,
  readTimezoneFromRequest,
  type AnalyticsRange,
} from "@/lib/gamification";
import { getAuthContext } from "@/lib/supabase/server";

const querySchema = z.object({
  range: z.enum(["day", "week", "month"]).default("week"),
});

function rangeStartDate(range: AnalyticsRange, today: string): string {
  const days = range === "day" ? 0 : range === "week" ? 6 : 29;
  const [year, month, day] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day - days));
  return utc.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const context = await getAuthContext(request);

  if (!context.configured || !context.supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    range: url.searchParams.get("range") ?? "week",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics range." }, { status: 400 });
  }

  const timeZone = readTimezoneFromRequest(request);
  const normalizedToday = localDateKey(new Date(), timeZone);

  const startDate =
    parsed.data.range === "day"
      ? normalizedToday
      : rangeStartDate(parsed.data.range, normalizedToday);

  const { data: events, error } = await context.supabase
    .from("user_activity_events")
    .select("event_type,xp_awarded,local_date,occurred_at")
    .eq("user_id", context.user.id)
    .gte("local_date", startDate)
    .order("occurred_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const analytics = buildAnalytics(
    events ?? [],
    parsed.data.range,
    timeZone,
    new Date(),
  );

  return NextResponse.json({ analytics });
}
