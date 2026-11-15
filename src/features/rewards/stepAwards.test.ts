import { describe, expect, it } from "vitest";
import { totalAwarded } from "./earning";
import { awardsForCheckIn, type StepDoneFacts } from "./stepAwards";

const routine = ["s1", "s2", "s3"];

function facts(overrides: Partial<StepDoneFacts>): StepDoneFacts {
  return { stepId: "s1", routineStepIds: routine, doneTodayBefore: [], hasFirstRoutineAward: true, ...overrides };
}

describe("awardsForCheckIn", () => {
  it("pays 5 tokens for a step in the middle of the routine", () => {
    expect(awardsForCheckIn(facts({ stepId: "s1" }))).toEqual([{ amount: 5, reason: "step" }]);
  });

  it("adds the routine bonus on the tap that finishes the routine", () => {
    const awards = awardsForCheckIn(facts({ stepId: "s3", doneTodayBefore: ["s1", "s2"] }));
    expect(awards).toEqual([
      { amount: 5, reason: "step" },
      { amount: 20, reason: "routine" },
    ]);
  });

  it("finishes the routine even when steps were done out of order", () => {
    const awards = awardsForCheckIn(facts({ stepId: "s1", doneTodayBefore: ["s3", "s2"] }));
    expect(totalAwarded(awards)).toBe(25);
  });

  it("adds the first routine bonus only if it was never given before", () => {
    const first = awardsForCheckIn(facts({ stepId: "s3", doneTodayBefore: ["s1", "s2"], hasFirstRoutineAward: false }));
    expect(totalAwarded(first)).toBe(75);
    expect(first.map((a) => a.reason)).toContain("first_routine");
  });

  it("does not give the first routine bonus for a step that doesn't finish the routine", () => {
    expect(totalAwarded(awardsForCheckIn(facts({ stepId: "s1", hasFirstRoutineAward: false })))).toBe(5);
  });

  it("pays a one-step routine its step and routine tokens", () => {
    expect(totalAwarded(awardsForCheckIn(facts({ stepId: "only", routineStepIds: ["only"] })))).toBe(25);
  });

  // Double taps and repeats
  it("pays nothing when the step was already done today", () => {
    expect(awardsForCheckIn(facts({ stepId: "s2", doneTodayBefore: ["s1", "s2"] }))).toEqual([]);
  });

  it("pays no second routine bonus when the routine is repeated the same day", () => {
    expect(awardsForCheckIn(facts({ stepId: "s3", doneTodayBefore: ["s1", "s2", "s3"] }))).toEqual([]);
  });

  it("pays nothing for a step that isn't in the routine", () => {
    expect(awardsForCheckIn(facts({ stepId: "other" }))).toEqual([]);
  });

  it("ignores done steps from other routines", () => {
    expect(awardsForCheckIn(facts({ stepId: "s1", doneTodayBefore: ["x1", "x2"] }))).toEqual([{ amount: 5, reason: "step" }]);
  });

  // Safety rule: using help never reduces tokens.
  it("using help earns the same tokens", () => {
    const base = { stepId: "s3", doneTodayBefore: ["s1", "s2"], hasFirstRoutineAward: false };
    expect(awardsForCheckIn(facts({ ...base, usedHelp: true }))).toEqual(awardsForCheckIn(facts({ ...base, usedHelp: false })));
  });

  it("never returns a zero or negative award", () => {
    const awards = awardsForCheckIn(facts({ stepId: "s3", doneTodayBefore: ["s1", "s2"], hasFirstRoutineAward: false }));
    for (const award of awards) expect(award.amount).toBeGreaterThan(0);
  });
});
