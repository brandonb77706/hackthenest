import { describe, expect, it } from "vitest";
import { STREAK_MILESTONES, TOKENS_FOR, awardsForStepDone, streakBonus, totalAwarded } from "./earning";

describe("awardsForStepDone", () => {
  it("gives 5 tokens for a normal step", () => {
    const awards = awardsForStepDone({ finishedRoutine: false, firstRoutineEver: false });
    expect(awards).toEqual([{ amount: 5, reason: "step" }]);
  });

  it("adds the 20 token routine bonus on the last step", () => {
    const awards = awardsForStepDone({ finishedRoutine: true, firstRoutineEver: false });
    expect(awards).toEqual([
      { amount: 5, reason: "step" },
      { amount: 20, reason: "routine" },
    ]);
  });

  it("adds the 50 token first routine bonus only when a routine is finished", () => {
    expect(totalAwarded(awardsForStepDone({ finishedRoutine: true, firstRoutineEver: true }))).toBe(75);
    // firstRoutineEver alone (routine not finished yet) earns nothing extra
    expect(totalAwarded(awardsForStepDone({ finishedRoutine: false, firstRoutineEver: true }))).toBe(5);
  });

  // Safety rule: using help never reduces tokens.
  it.each([
    [false, false],
    [true, false],
    [true, true],
  ])("using help earns the same tokens (finished=%s, first=%s)", (finishedRoutine: boolean, firstRoutineEver: boolean) => {
    const withoutHelp = awardsForStepDone({ finishedRoutine, firstRoutineEver, usedHelp: false });
    const withHelp = awardsForStepDone({ finishedRoutine, firstRoutineEver, usedHelp: true });
    expect(withHelp).toEqual(withoutHelp);
  });

  it("never gives a zero or negative award", () => {
    const awards = awardsForStepDone({ finishedRoutine: true, firstRoutineEver: true, usedHelp: true });
    for (const award of awards) expect(award.amount).toBeGreaterThan(0);
  });
});

describe("streakBonus", () => {
  it.each(STREAK_MILESTONES.map((m) => [m.days, m.tokens]))(
    "a %i-day streak earns %i tokens",
    (days: number, tokens: number) => {
      expect(streakBonus(days)).toEqual({ amount: tokens, reason: "streak" });
    },
  );

  it.each([0, 1, 2, 4, 6, 8, 29, 31, -3])("no bonus on day %i", (days: number) => {
    expect(streakBonus(days)).toBeNull();
  });
});

describe("totalAwarded", () => {
  it("is 0 for no awards", () => {
    expect(totalAwarded([])).toBe(0);
  });

  it("adds every award", () => {
    expect(totalAwarded([{ amount: TOKENS_FOR.step, reason: "step" }, { amount: TOKENS_FOR.camera, reason: "camera" }])).toBe(15);
  });
});
