import { describe, expect, it } from "vitest";
import { checkRoutine, cleanRoutine, hasStepErrors, LIMITS, readRoutineInput, type RoutineInput } from "./routineInput";

const valid = (): RoutineInput => ({
  title: "Take medicine",
  goal: "",
  days: ["mon", "tue"],
  start_time: "08:00",
  tone: "sea",
  remind: true,
  steps: [{ text: "Get your pill box", minutes: 1 }],
});

const errorsFor = (input: RoutineInput) => {
  const result = checkRoutine(input);
  return result.ok ? {} : result.errors;
};

describe("checkRoutine", () => {
  it("accepts a valid routine, including a single step", () => {
    expect(checkRoutine(valid()).ok).toBe(true);
  });

  it("trims text before checking and returns the cleaned routine", () => {
    const result = checkRoutine({ ...valid(), title: "  Pills  ", steps: [{ text: "  Take it ", minutes: 2 }] });
    expect(result.ok && result.value.title).toBe("Pills");
    expect(result.ok && result.value.steps[0].text).toBe("Take it");
  });

  it("needs a title of a sensible length", () => {
    expect(errorsFor({ ...valid(), title: "   " }).title).toMatch(/Add a name/);
    expect(errorsFor({ ...valid(), title: "x".repeat(LIMITS.titleMax + 1) }).title).toBeDefined();
  });

  it("needs 1 to 15 steps", () => {
    expect(errorsFor({ ...valid(), steps: [] }).steps).toMatch(/at least one/);
    const many = Array.from({ length: LIMITS.stepsMax + 1 }, () => ({ text: "Do it", minutes: 1 }));
    expect(errorsFor({ ...valid(), steps: many }).steps).toBeDefined();
  });

  it("points at the exact step with a problem", () => {
    const errors = errorsFor({
      ...valid(),
      steps: [
        { text: "Fine", minutes: 1 },
        { text: "", minutes: 1 },
        { text: "Too long", minutes: 0 },
      ],
    });
    expect(errors.step?.[0]).toBeUndefined();
    expect(errors.step?.[1]?.text).toMatch(/Write what to do/);
    expect(errors.step?.[2]?.minutes).toMatch(/1 to 120/);
  });

  it("rejects minutes that aren't whole numbers in range", () => {
    for (const minutes of [0, 121, 2.5, Number.NaN]) {
      expect(errorsFor({ ...valid(), steps: [{ text: "x", minutes }] }).step?.[0]?.minutes).toBeDefined();
    }
  });

  it("needs at least one day and a real time", () => {
    expect(errorsFor({ ...valid(), days: [] }).days).toMatch(/at least one day/);
    expect(errorsFor({ ...valid(), start_time: "" }).start_time).toBeDefined();
    expect(errorsFor({ ...valid(), start_time: "25:00" }).start_time).toBeDefined();
  });
});

describe("hasStepErrors", () => {
  it("is true only for problems on the steps screen", () => {
    expect(hasStepErrors({ title: "x" })).toBe(true);
    expect(hasStepErrors({ step: { 0: { text: "x" } } })).toBe(true);
    expect(hasStepErrors({ days: "x", start_time: "x" })).toBe(false);
  });
});

describe("cleanRoutine", () => {
  it("puts days in week order and drops duplicates", () => {
    expect(cleanRoutine({ ...valid(), days: ["sun", "mon", "sun"] }).days).toEqual(["mon", "sun"]);
  });

  it("keeps step ids for saved steps", () => {
    const steps = cleanRoutine({ ...valid(), steps: [{ id: "abc", text: "x", minutes: 1 }] }).steps;
    expect(steps[0].id).toBe("abc");
  });
});

describe("readRoutineInput", () => {
  it("reads a well-formed body", () => {
    expect(readRoutineInput(valid())).toEqual(valid());
  });

  it("treats a missing goal as empty", () => {
    const body: Partial<RoutineInput> = valid();
    delete body.goal;
    expect(readRoutineInput(body)?.goal).toBe("");
  });

  it("defaults to blue and reminders on when color or remind is missing or odd", () => {
    const body: Record<string, unknown> = { ...valid(), tone: "purple" };
    delete body.remind;
    expect(readRoutineInput(body)).toMatchObject({ tone: "teal", remind: true });
    expect(readRoutineInput({ ...valid(), remind: false })?.remind).toBe(false);
  });

  it("rejects bodies with the wrong shape", () => {
    expect(readRoutineInput(null)).toBeNull();
    expect(readRoutineInput("text")).toBeNull();
    expect(readRoutineInput({ ...valid(), days: ["monday"] })).toBeNull();
    expect(readRoutineInput({ ...valid(), steps: "nope" })).toBeNull();
    expect(readRoutineInput({ ...valid(), steps: [{ text: "x", minutes: "5" }] })).toBeNull();
    expect(readRoutineInput({ ...valid(), steps: [{ id: 5, text: "x", minutes: 5 }] })).toBeNull();
  });
});
