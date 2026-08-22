import { describe, expect, it } from "vitest";
import {
  ACTIVITY_XP,
  addLocalDays,
  buildAnalytics,
  computeStreakAfterActivity,
  localDateKey,
  parseCoachTourState,
  pendingTourSteps,
  pickCoachMessage,
  streakAtRisk,
} from "./gamification";

describe("localDateKey", () => {
  it("formats calendar date in a timezone", () => {
    const instant = new Date("2026-08-05T20:30:00.000Z");
    expect(localDateKey(instant, "Asia/Kolkata")).toBe("2026-08-06");
    expect(localDateKey(instant, "UTC")).toBe("2026-08-05");
  });
});

describe("computeStreakAfterActivity", () => {
  const base = {
    current_streak: 3,
    longest_streak: 5,
    last_qualifying_date: "2026-08-04",
  };

  it("keeps streak on same day", () => {
    expect(computeStreakAfterActivity(base, "2026-08-04")).toEqual({
      currentStreak: 3,
      longestStreak: 5,
      lastQualifyingDate: "2026-08-04",
    });
  });

  it("increments on consecutive day", () => {
    expect(computeStreakAfterActivity(base, "2026-08-05")).toEqual({
      currentStreak: 4,
      longestStreak: 5,
      lastQualifyingDate: "2026-08-05",
    });
  });

  it("resets after a gap", () => {
    expect(computeStreakAfterActivity(base, "2026-08-06")).toEqual({
      currentStreak: 1,
      longestStreak: 5,
      lastQualifyingDate: "2026-08-06",
    });
  });

  it("starts streak from empty", () => {
    expect(
      computeStreakAfterActivity(
        { current_streak: 0, longest_streak: 0, last_qualifying_date: null },
        "2026-08-01",
      ),
    ).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastQualifyingDate: "2026-08-01",
    });
  });
});

describe("addLocalDays", () => {
  it("steps backward one day", () => {
    expect(addLocalDays("2026-08-05", -1)).toBe("2026-08-04");
  });
});

describe("coach tour", () => {
  it("lists pending steps", () => {
    const state = parseCoachTourState({ version: 1, steps: ["welcome", "feed"] });
    expect(pendingTourSteps(state)).toEqual([
      "learn_tab",
      "learn_live",
      "learn_tools",
      "library",
      "settings",
    ]);
  });
});

describe("pickCoachMessage", () => {
  it("prioritizes onboarding when tour is done", () => {
    const message = pickCoachMessage({
      summary: {
        currentStreak: 0,
        longestStreak: 0,
        totalXp: 0,
        dailyGoal: 3,
        todayEventCount: 0,
        todayXp: 0,
        onboardingStep: 1,
        coachTour: { version: 1, steps: ["welcome", "feed", "learn_tab", "learn_live", "learn_tools", "library", "settings"] },
        pendingTourSteps: [],
      },
    });
    expect(message.id).toBe("onboarding_create_space");
  });

  it("does not show 'come back tomorrow' on first streak day when goal not met", () => {
    const message = pickCoachMessage({
      summary: {
        currentStreak: 1,
        longestStreak: 1,
        totalXp: 0,
        dailyGoal: 3,
        todayEventCount: 1,
        todayXp: 5,
        onboardingStep: 3,
        coachTour: {
          version: 1,
          steps: [
            "welcome",
            "feed",
            "learn_tab",
            "learn_live",
            "learn_tools",
            "library",
            "settings",
          ],
        },
        pendingTourSteps: [],
      },
    });
    expect(message.id).toBe("daily_goal_progress");
  });

  it("shows daily goal met even with first streak day", () => {
    const message = pickCoachMessage({
      summary: {
        currentStreak: 1,
        longestStreak: 1,
        totalXp: 0,
        dailyGoal: 3,
        todayEventCount: 3,
        todayXp: 15,
        onboardingStep: 3,
        coachTour: {
          version: 1,
          steps: [
            "welcome",
            "feed",
            "learn_tab",
            "learn_live",
            "learn_tools",
            "library",
            "settings",
          ],
        },
        pendingTourSteps: [],
      },
    });
    expect(message.id).toBe("daily_goal_met");
  });
});

describe("streakAtRisk", () => {
  it("flags when yesterday counted but not today", () => {
    expect(
      streakAtRisk(
        {
          user_id: "u",
          current_streak: 4,
          longest_streak: 4,
          last_qualifying_date: "2026-08-04",
          total_xp: 0,
          daily_goal: 3,
          coach_tour_completed: {},
          updated_at: "",
        },
        "2026-08-05",
        0,
      ),
    ).toBe(true);
  });
});

describe("buildAnalytics", () => {
  it("aggregates the current week as seven weekday bars for the day range", () => {
    const now = new Date("2026-08-07T12:00:00.000Z"); // Friday
    const today = localDateKey(now, "UTC");
    const analytics = buildAnalytics(
      [
        {
          event_type: "feed_attempt",
          xp_awarded: ACTIVITY_XP.feed_attempt,
          local_date: today,
          occurred_at: now.toISOString(),
        },
        {
          event_type: "feed_completed",
          xp_awarded: ACTIVITY_XP.feed_completed,
          local_date: addLocalDays(today, -1),
          occurred_at: addLocalDays(today, -1) + "T10:00:00.000Z",
        },
      ],
      "day",
      "UTC",
      now,
    );
    expect(analytics.buckets).toHaveLength(7);
    expect(analytics.buckets.map((bucket) => bucket.label)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(analytics.buckets.find((bucket) => bucket.label === "Fri")?.eventCount).toBe(1);
    expect(analytics.buckets.find((bucket) => bucket.label === "Thu")?.eventCount).toBe(1);
  });

  it("aggregates last four weeks for the week range", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const today = localDateKey(now, "UTC");
    const analytics = buildAnalytics(
      [
        {
          event_type: "feed_attempt",
          xp_awarded: ACTIVITY_XP.feed_attempt,
          local_date: today,
          occurred_at: now.toISOString(),
        },
        {
          event_type: "feed_completed",
          xp_awarded: ACTIVITY_XP.feed_completed,
          local_date: addLocalDays(today, -1),
          occurred_at: addLocalDays(today, -1) + "T10:00:00.000Z",
        },
      ],
      "week",
      "UTC",
      now,
    );
    expect(analytics.totalEvents).toBe(2);
    expect(analytics.byType.feed_attempt?.count).toBe(1);
    expect(analytics.buckets).toHaveLength(4);
    expect(analytics.buckets[3]?.eventCount).toBe(2);
  });

  it("aggregates last twelve months for the month range", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const analytics = buildAnalytics(
      [
        {
          event_type: "feed_attempt",
          xp_awarded: ACTIVITY_XP.feed_attempt,
          local_date: "2026-08-05",
          occurred_at: now.toISOString(),
        },
      ],
      "month",
      "UTC",
      now,
    );
    expect(analytics.buckets).toHaveLength(12);
    expect(analytics.buckets[11]?.label).toBe("Aug");
    expect(analytics.buckets[11]?.eventCount).toBe(1);
  });
});
