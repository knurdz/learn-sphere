import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Material, StudySpace } from "@/lib/supabase/database";
import { getOnboardingStep } from "@/lib/onboarding";

export const COACH_TOUR_VERSION = 1;

export const COACH_TOUR_STEPS = [
  "welcome",
  "feed",
  "learn_tab",
  "learn_live",
  "learn_tools",
  "library",
  "settings",
] as const;

export type CoachTourStepId = (typeof COACH_TOUR_STEPS)[number];

export type ActivityEventType =
  | "feed_completed"
  | "feed_attempt"
  | "video_quiz_completed"
  | "study_tool_generated"
  | "material_uploaded"
  | "tutor_message"
  | "live_tutor_started";

export const ACTIVITY_XP: Record<ActivityEventType, number> = {
  feed_completed: 5,
  feed_attempt: 10,
  video_quiz_completed: 15,
  study_tool_generated: 10,
  material_uploaded: 12,
  tutor_message: 8,
  live_tutor_started: 20,
};

export type UserGamificationRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualifying_date: string | null;
  total_xp: number;
  daily_goal: number;
  coach_tour_completed: Json;
  updated_at: string;
};

export type CoachTourState = {
  version: number;
  steps: string[];
};

export type CoachMessagePayload = {
  id: string;
  text: string;
  ctaLabel: string | null;
  ctaRoute: string | null;
};

export type GamificationSummary = {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  dailyGoal: number;
  todayEventCount: number;
  todayXp: number;
  onboardingStep: 1 | 2 | 3;
  coachTour: CoachTourState;
  pendingTourSteps: CoachTourStepId[];
  coachMessage: CoachMessagePayload;
};

export type AnalyticsRange = "day" | "week" | "month";

export type AnalyticsBucket = {
  label: string;
  startDate: string;
  eventCount: number;
  xp: number;
};

export type ActivityAnalytics = {
  range: AnalyticsRange;
  timezone: string;
  totalEvents: number;
  totalXp: number;
  byType: Record<string, { count: number; xp: number }>;
  buckets: AnalyticsBucket[];
};

const DEFAULT_TIMEZONE = "UTC";

export function parseCoachTourState(raw: Json | null | undefined): CoachTourState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { version: COACH_TOUR_VERSION, steps: [] };
  }
  const record = raw as Record<string, Json | undefined>;
  const version = typeof record.version === "number" ? record.version : COACH_TOUR_VERSION;
  const steps = Array.isArray(record.steps)
    ? record.steps.filter((step): step is string => typeof step === "string")
    : [];
  return { version, steps };
}

export function pendingTourSteps(completed: CoachTourState): CoachTourStepId[] {
  const done = new Set(completed.steps);
  return COACH_TOUR_STEPS.filter((step) => !done.has(step));
}

export function localDateKey(instant: Date, timeZone: string): string {
  const tz = timeZone.trim() || DEFAULT_TIMEZONE;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // fall through
  }
  return instant.toISOString().slice(0, 10);
}

export function addLocalDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return utc.toISOString().slice(0, 10);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Monday of the ISO week that contains [dateKey]. */
export function startOfIsoWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addLocalDays(dateKey, offset);
}

export function analyticsRangeStart(range: AnalyticsRange, today: string): string {
  if (range === "day") return startOfIsoWeek(today);
  if (range === "week") return addLocalDays(startOfIsoWeek(today), -21);
  const [year, month] = today.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 - 11, 1));
  return start.toISOString().slice(0, 10);
}

function weekdayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return WEEKDAY_SHORT[utc.getUTCDay()];
}

function compactDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${MONTH_SHORT[Number(month) - 1]} ${Number(day)}`;
}

function yearMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function computeStreakAfterActivity(
  row: Pick<UserGamificationRow, "current_streak" | "longest_streak" | "last_qualifying_date">,
  activityLocalDate: string,
): { currentStreak: number; longestStreak: number; lastQualifyingDate: string } {
  const last = row.last_qualifying_date;
  if (last === activityLocalDate) {
    return {
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastQualifyingDate: last,
    };
  }

  let nextStreak = 1;
  if (last) {
    const yesterday = addLocalDays(activityLocalDate, -1);
    if (last === yesterday) {
      nextStreak = row.current_streak + 1;
    }
  }

  const longest = Math.max(row.longest_streak, nextStreak);
  return {
    currentStreak: nextStreak,
    longestStreak: longest,
    lastQualifyingDate: activityLocalDate,
  };
}

export function pickCoachMessage(input: {
  summary: Omit<GamificationSummary, "coachMessage">;
  streakAtRisk?: boolean;
}): CoachMessagePayload {
  const { summary } = input;
  const pending = summary.pendingTourSteps[0];

  if (pending === "welcome") {
    return {
      id: "tour_welcome",
      text: "Hi! I'm Sphere, your study coach. I'll show you around so learning feels like a game.",
      ctaLabel: "Let's go",
      ctaRoute: null,
    };
  }
  if (pending) {
    const tourCopy: Record<string, CoachMessagePayload> = {
      feed: {
        id: "tour_feed",
        text: "Your Feed is where memes, quizzes, and flashcards show up. Swipe through and earn XP.",
        ctaLabel: null,
        ctaRoute: "/feed",
      },
      learn_tab: {
        id: "tour_learn_tab",
        text: "Tap Learn for your live AI tutor and deeper study tools.",
        ctaLabel: "Open Learn",
        ctaRoute: "/learn",
      },
      learn_live: {
        id: "tour_learn_live",
        text: "Start a live session to talk through tough topics with voice and video.",
        ctaLabel: null,
        ctaRoute: "/learn?tab=live",
      },
      learn_tools: {
        id: "tour_learn_tools",
        text: "Study tools turn your library into video quizzes and lesson guides.",
        ctaLabel: null,
        ctaRoute: "/learn?tab=tools",
      },
      library: {
        id: "tour_library",
        text: "Library holds your study spaces and uploads. Add a PDF or video to unlock the magic.",
        ctaLabel: "Open Library",
        ctaRoute: "/library",
      },
      settings: {
        id: "tour_settings",
        text: "Tweak language, theme, and more in Settings anytime.",
        ctaLabel: "Settings",
        ctaRoute: "/settings",
      },
    };
    return (
      tourCopy[pending] ?? {
        id: "tour_continue",
        text: "Keep exploring — you're doing great!",
        ctaLabel: null,
        ctaRoute: null,
      }
    );
  }

  if (summary.onboardingStep === 1) {
    return {
      id: "onboarding_create_space",
      text: "Create your first study space so I know what you're learning.",
      ctaLabel: "Create space",
      ctaRoute: "/library?prompt=createSpace",
    };
  }
  if (summary.onboardingStep === 2) {
    return {
      id: "onboarding_upload_material",
      text: "Upload a PDF or video to your space — then I can build your feed and tutor.",
      ctaLabel: "Add material",
      ctaRoute: "/library?prompt=upload",
    };
  }

  if (input.streakAtRisk && summary.currentStreak > 0) {
    return {
      id: "streak_at_risk",
      text: `Your ${summary.currentStreak}-day streak is waiting! One quick activity keeps it alive.`,
      ctaLabel: "Go to Feed",
      ctaRoute: "/feed",
    };
  }

  if (summary.todayEventCount >= summary.dailyGoal) {
    return {
      id: "daily_goal_met",
      text: "Daily goal crushed! Extra practice still earns XP if you're in the mood.",
      ctaLabel: "See progress",
      ctaRoute: "/progress",
    };
  }

  if (summary.currentStreak >= 2 && summary.todayEventCount > 0) {
    return {
      id: "streak_continue",
      text: `${summary.currentStreak}-day streak! ${summary.dailyGoal - summary.todayEventCount} more activities hit today's goal.`,
      ctaLabel: "View stats",
      ctaRoute: "/progress",
    };
  }

  if (summary.todayEventCount > 0) {
    return {
      id: "daily_goal_progress",
      text: `${summary.todayEventCount}/${summary.dailyGoal} toward today's goal. You've got this.`,
      ctaLabel: "Keep learning",
      ctaRoute: "/feed",
    };
  }

  return {
    id: "empty_encourage",
    text: "Ready when you are — pick a quiz, chat with the tutor, or upload something new.",
    ctaLabel: "Start on Feed",
    ctaRoute: "/feed",
  };
}

type ActivityEventRow = {
  event_type: string;
  xp_awarded: number;
  local_date: string;
  occurred_at: string;
};

export function buildAnalytics(
  events: ActivityEventRow[],
  range: AnalyticsRange,
  timeZone: string,
  now: Date = new Date(),
): ActivityAnalytics {
  const tz = timeZone.trim() || DEFAULT_TIMEZONE;
  const today = localDateKey(now, tz);
  const byType: Record<string, { count: number; xp: number }> = {};
  let totalEvents = 0;
  let totalXp = 0;

  for (const event of events) {
    totalEvents += 1;
    totalXp += event.xp_awarded;
    const bucket = byType[event.event_type] ?? { count: 0, xp: 0 };
    bucket.count += 1;
    bucket.xp += event.xp_awarded;
    byType[event.event_type] = bucket;
  }

  const buckets: AnalyticsBucket[] = [];
  if (range === "day") {
    const start = startOfIsoWeek(today);
    const dayMap = new Map<string, AnalyticsBucket>();
    for (let i = 0; i < 7; i += 1) {
      const key = addLocalDays(start, i);
      dayMap.set(key, {
        label: weekdayLabel(key),
        startDate: key,
        eventCount: 0,
        xp: 0,
      });
    }
    for (const event of events) {
      const bucket = dayMap.get(event.local_date);
      if (!bucket) continue;
      bucket.eventCount += 1;
      bucket.xp += event.xp_awarded;
    }
    buckets.push(...dayMap.values());
  } else if (range === "week") {
    const thisMonday = startOfIsoWeek(today);
    const weekMap = new Map<string, AnalyticsBucket>();
    const weekStarts: string[] = [];
    for (let w = 0; w < 4; w += 1) {
      const weekStart = addLocalDays(thisMonday, (w - 3) * 7);
      weekStarts.push(weekStart);
      weekMap.set(weekStart, {
        label: compactDateLabel(weekStart),
        startDate: weekStart,
        eventCount: 0,
        xp: 0,
      });
    }
    for (const event of events) {
      const eventWeek = startOfIsoWeek(event.local_date);
      const bucket = weekMap.get(eventWeek);
      if (!bucket) continue;
      bucket.eventCount += 1;
      bucket.xp += event.xp_awarded;
    }
    buckets.push(...weekStarts.map((key) => weekMap.get(key)!));
  } else {
    const [year, month] = today.split("-").map(Number);
    const monthMap = new Map<string, AnalyticsBucket>();
    const monthKeys: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const cursor = new Date(Date.UTC(year, month - 1 - i, 1));
      const key = cursor.toISOString().slice(0, 7);
      monthKeys.push(key);
      monthMap.set(key, {
        label: MONTH_SHORT[cursor.getUTCMonth()],
        startDate: `${key}-01`,
        eventCount: 0,
        xp: 0,
      });
    }
    for (const event of events) {
      const bucket = monthMap.get(yearMonthKey(event.local_date));
      if (!bucket) continue;
      bucket.eventCount += 1;
      bucket.xp += event.xp_awarded;
    }
    buckets.push(...monthKeys.map((key) => monthMap.get(key)!));
  }

  return {
    range,
    timezone: tz,
    totalEvents,
    totalXp,
    byType,
    buckets,
  };
}

export function streakAtRisk(
  row: UserGamificationRow,
  todayLocalDate: string,
  todayEventCount: number,
): boolean {
  if (todayEventCount > 0) return false;
  if (!row.last_qualifying_date || row.current_streak === 0) return false;
  const yesterday = addLocalDays(todayLocalDate, -1);
  return row.last_qualifying_date === yesterday;
}

export async function ensureGamificationRow(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserGamificationRow> {
  const { data, error } = await supabase
    .from("user_gamification")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserGamificationRow;

  const { data: inserted, error: insertError } = await supabase
    .from("user_gamification")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as UserGamificationRow;
}

export async function fetchGamificationSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  timeZone: string,
  studySpaces: StudySpace[],
  materials: Material[],
): Promise<GamificationSummary> {
  const tz = timeZone.trim() || DEFAULT_TIMEZONE;
  const now = new Date();
  const today = localDateKey(now, tz);

  const row = await ensureGamificationRow(supabase, userId);

  const { count: todayEventCount, error: countError } = await supabase
    .from("user_activity_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("local_date", today);

  if (countError) throw countError;

  const { data: todayEvents, error: todayXpError } = await supabase
    .from("user_activity_events")
    .select("xp_awarded")
    .eq("user_id", userId)
    .eq("local_date", today);

  if (todayXpError) throw todayXpError;

  const todayXp = (todayEvents ?? []).reduce((sum, event) => sum + event.xp_awarded, 0);
  const coachTour = parseCoachTourState(row.coach_tour_completed);
  const pending = pendingTourSteps(coachTour);
  const onboardingStep = getOnboardingStep(studySpaces, materials);

  const base = {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    totalXp: row.total_xp,
    dailyGoal: row.daily_goal,
    todayEventCount: todayEventCount ?? 0,
    todayXp,
    onboardingStep,
    coachTour,
    pendingTourSteps: pending,
  };

  const atRisk = streakAtRisk(row, today, todayEventCount ?? 0);
  const coachMessage = pickCoachMessage({ summary: base, streakAtRisk: atRisk });

  return { ...base, coachMessage };
}

export async function recordQualifyingActivity(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    eventType: ActivityEventType;
    timeZone?: string;
    metadata?: Record<string, Json | undefined>;
    idempotencyKey?: string;
    occurredAt?: Date;
  },
): Promise<void> {
  const timeZone = input.timeZone?.trim() || DEFAULT_TIMEZONE;
  const occurredAt = input.occurredAt ?? new Date();
  const localDate = localDateKey(occurredAt, timeZone);
  const xp = ACTIVITY_XP[input.eventType];
  const metadata: Record<string, Json | undefined> = {
    ...(input.metadata ?? {}),
  };
  if (input.idempotencyKey) {
    metadata.idempotency_key = input.idempotencyKey;
  }

  const row = await ensureGamificationRow(supabase, input.userId);

  const { error: insertError } = await supabase.from("user_activity_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    metadata: metadata as Json,
    local_date: localDate,
    xp_awarded: xp,
    occurred_at: occurredAt.toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return;
    }
    throw insertError;
  }

  const streakUpdate = computeStreakAfterActivity(row, localDate);
  const { data: updated, error: updateError } = await supabase
    .from("user_gamification")
    .update({
      current_streak: streakUpdate.currentStreak,
      longest_streak: streakUpdate.longestStreak,
      last_qualifying_date: streakUpdate.lastQualifyingDate,
      total_xp: row.total_xp + xp,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .select("user_id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) {
    throw new Error("Could not update gamification progress.");
  }
}

export function readTimezoneFromRequest(request: Request): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("timezone");
  if (fromQuery?.trim()) return fromQuery.trim();
  return request.headers.get("x-timezone")?.trim() || DEFAULT_TIMEZONE;
}

export async function completeCoachTourStep(
  supabase: SupabaseClient<Database>,
  userId: string,
  stepId: CoachTourStepId,
): Promise<CoachTourState> {
  if (!COACH_TOUR_STEPS.includes(stepId)) {
    throw new Error("Unknown tour step.");
  }

  const row = await ensureGamificationRow(supabase, userId);
  const current = parseCoachTourState(row.coach_tour_completed);
  const steps = new Set(current.steps);
  steps.add(stepId);
  const next: CoachTourState = {
    version: COACH_TOUR_VERSION,
    steps: COACH_TOUR_STEPS.filter((step) => steps.has(step)),
  };

  const { data, error } = await supabase
    .from("user_gamification")
    .update({
      coach_tour_completed: next as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Could not save tour progress. Check database permissions.");
  }
  return next;
}

export async function skipCoachTour(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CoachTourState> {
  const next: CoachTourState = {
    version: COACH_TOUR_VERSION,
    steps: [...COACH_TOUR_STEPS],
  };

  const { data, error } = await supabase
    .from("user_gamification")
    .update({
      coach_tour_completed: next as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Could not skip the tour. Check database permissions.");
  }
  return next;
}

export async function recordActivityFailOpen(
  supabase: SupabaseClient<Database> | null | undefined,
  input: Parameters<typeof recordQualifyingActivity>[1],
): Promise<void> {
  if (!supabase) return;
  try {
    await recordQualifyingActivity(supabase, input);
  } catch (error) {
    console.error("[gamification] record activity failed:", error);
  }
}
