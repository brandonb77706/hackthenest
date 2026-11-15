import { describe, expect, it } from "vitest";
import { streakProgress } from "./streakProgress";

const buddies = [
  { name: "Bronze Star Buddy", streak_required: 7 },
  { name: "Silver Star Buddy", streak_required: 14 },
  { name: "Gold Star Buddy", streak_required: 30 },
];

describe("streakProgress", () => {
  it("invites the user to start when the streak is 0", () => {
    expect(streakProgress(0)).toEqual({
      label: "Streak: 0 days",
      percent: 0,
      detail: "Do one routine today to start your streak.",
    });
  });

  it("counts toward the next milestone from day 0", () => {
    expect(streakProgress(4)).toEqual({
      label: "Streak: 4 days",
      percent: 57,
      detail: "3 more days to get 50 coins.",
    });
  });

  it("uses singular words for 1", () => {
    expect(streakProgress(1).label).toBe("Streak: 1 day");
    expect(streakProgress(2).detail).toBe("1 more day to get 25 coins.");
  });

  it("does not reset to empty after reaching a milestone", () => {
    const result = streakProgress(7);
    expect(result.percent).toBe(50);
    expect(result.detail).toBe("7 more days to get 100 coins.");
  });

  it.each([30, 45])("is full after every milestone (%i days)", (days: number) => {
    const result = streakProgress(days);
    expect(result.percent).toBe(100);
    expect(result.detail).toBe("You reached every streak reward.");
  });

  it("names the streak Buddy waiting at the next milestone", () => {
    expect(streakProgress(4, { streakBuddies: buddies }).detail).toBe(
      "3 more days to get 50 coins and Bronze Star Buddy.",
    );
  });

  it("shows only coins when no Buddy unlocks at that milestone", () => {
    expect(streakProgress(1, { streakBuddies: buddies }).detail).toBe("2 more days to get 25 coins.");
  });

  it("mentions saved freezes", () => {
    expect(streakProgress(4, { freezes: 0 }).detail).toBe("3 more days to get 50 coins.");
    expect(streakProgress(4, { freezes: 1 }).detail).toBe("3 more days to get 50 coins. 1 freeze saved.");
    expect(streakProgress(4, { freezes: 2 }).detail).toBe("3 more days to get 50 coins. 2 freezes saved.");
    expect(streakProgress(0, { freezes: 2 }).detail).toBe("Do one routine today to start your streak. 2 freezes saved.");
  });

  it("handles bad input safely", () => {
    expect(streakProgress(-3).percent).toBe(0);
    expect(streakProgress(Number.NaN).percent).toBe(0);
    expect(streakProgress(4.7)).toEqual(streakProgress(4));
    expect(streakProgress(4, { freezes: -1 }).detail).toBe("3 more days to get 50 coins.");
  });

  it("keeps the percent between 0 and 100", () => {
    for (let days = 0; days <= 40; days++) {
      const { percent } = streakProgress(days);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });
});
