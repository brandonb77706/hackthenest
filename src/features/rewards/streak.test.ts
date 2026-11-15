import { describe, expect, it } from "vitest";
import { advanceStreak, dayBefore, liveStreak, streakBuddiesToUnlock, type StreakState } from "./streak";

const state = (over: Partial<StreakState> = {}): StreakState => ({
  current_streak: 0,
  longest_streak: 0,
  streak_freezes: 0,
  last_streak_date: null,
  ...over,
});

it("dayBefore crosses months and years", () => {
  expect(dayBefore("2026-12-01")).toBe("2026-11-30");
  expect(dayBefore("2027-01-01")).toBe("2026-12-31");
});

describe("advanceStreak", () => {
  it("starts at 1 on the first streak day", () => {
    expect(advanceStreak(state(), "2026-11-15")).toMatchObject({ current_streak: 1, longest_streak: 1, last_streak_date: "2026-11-15", changed: true });
  });

  it("doesn't change on a second routine the same day", () => {
    const s = state({ current_streak: 4, longest_streak: 4, last_streak_date: "2026-11-15" });
    expect(advanceStreak(s, "2026-11-15")).toMatchObject({ current_streak: 4, changed: false });
  });

  it("adds a day after yesterday", () => {
    expect(advanceStreak(state({ current_streak: 2, longest_streak: 5, last_streak_date: "2026-11-14" }), "2026-11-15")).toMatchObject({
      current_streak: 3,
      longest_streak: 5,
    });
  });

  it("a freeze covers one missed day", () => {
    const s = state({ current_streak: 6, longest_streak: 6, streak_freezes: 1, last_streak_date: "2026-11-13" });
    expect(advanceStreak(s, "2026-11-15")).toMatchObject({ current_streak: 7, streak_freezes: 0, usedFreeze: true });
  });

  it("starts again after a gap, but keeps the longest", () => {
    const s = state({ current_streak: 6, longest_streak: 6, streak_freezes: 0, last_streak_date: "2026-11-13" });
    expect(advanceStreak(s, "2026-11-15")).toMatchObject({ current_streak: 1, longest_streak: 6, usedFreeze: false });
  });
});

describe("liveStreak", () => {
  it("is still going today and the day after", () => {
    const s = state({ current_streak: 4, last_streak_date: "2026-11-14" });
    expect(liveStreak(s, "2026-11-14")).toBe(4);
    expect(liveStreak(s, "2026-11-15")).toBe(4);
    expect(liveStreak(s, "2026-11-16")).toBe(0);
    expect(liveStreak({ ...s, streak_freezes: 1 }, "2026-11-16")).toBe(4);
    expect(liveStreak(state(), "2026-11-16")).toBe(0);
  });
});

it("streakBuddiesToUnlock gives streak Buddies reached and not owned", () => {
  const catalog = [
    { id: "turtle", unlock_type: "streak" as const, streak_required: 7 },
    { id: "bunny", unlock_type: "streak" as const, streak_required: 14 },
    { id: "owl", unlock_type: "shop" as const, streak_required: null },
  ];
  expect(streakBuddiesToUnlock(7, catalog, []).map((a) => a.id)).toEqual(["turtle"]);
  expect(streakBuddiesToUnlock(20, catalog, ["turtle"]).map((a) => a.id)).toEqual(["bunny"]);
  expect(streakBuddiesToUnlock(3, catalog, [])).toEqual([]);
});
