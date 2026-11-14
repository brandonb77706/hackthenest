import { describe, expect, it } from "vitest";
import { buildRoutinePrompt, parseRoutine } from "./routineBuilder";

const step = (order: number, text = `Step ${order}`) => ({
  order,
  text,
  minutes: 5,
  image_prompt: `Picture of step ${order}`,
});

const routine = (count: number) => ({
  title: "Morning",
  steps: Array.from({ length: count }, (_, i) => step(i + 1)),
});

describe("buildRoutinePrompt", () => {
  it("includes the goal and support level", () => {
    const prompt = buildRoutinePrompt({ goal: "  Get ready for my 9am shift ", supportLevel: "high" });
    expect(prompt).toContain("Goal: Get ready for my 9am shift\n");
    expect(prompt).toContain("Support level: high");
    expect(prompt).not.toMatch(/\{\w+\}/);
  });
});

describe("parseRoutine", () => {
  it("accepts a valid routine", () => {
    const result = parseRoutine(routine(4), "medium");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Morning");
      expect(result.value.steps).toHaveLength(4);
    }
  });

  it("sorts steps and renumbers them from 1", () => {
    const raw = { title: "T", steps: [step(7, "C"), step(2, "A"), step(5, "B")] };
    const result = parseRoutine(raw, "medium");
    expect(result.ok && result.value.steps.map((s) => [s.order, s.text])).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]);
  });

  it("enforces the step count for each support level", () => {
    expect(parseRoutine(routine(3), "high").ok).toBe(false);
    expect(parseRoutine(routine(4), "high").ok).toBe(true);
    expect(parseRoutine(routine(10), "high").ok).toBe(true);
    expect(parseRoutine(routine(11), "high").ok).toBe(false);
    expect(parseRoutine(routine(2), "low").ok).toBe(true);
    expect(parseRoutine(routine(5), "low").ok).toBe(false);
  });

  it("rejects malformed responses", () => {
    expect(parseRoutine(null, "medium").ok).toBe(false);
    expect(parseRoutine("not json", "medium").ok).toBe(false);
    expect(parseRoutine([], "medium").ok).toBe(false);
    expect(parseRoutine({ title: "T", steps: "nope" }, "medium").ok).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(parseRoutine({ steps: routine(3).steps }, "medium").ok).toBe(false);
    expect(parseRoutine({ title: "T" }, "medium").ok).toBe(false);

    for (const field of ["text", "minutes", "image_prompt"] as const) {
      const raw = routine(3);
      delete (raw.steps[1] as Partial<ReturnType<typeof step>>)[field];
      const result = parseRoutine(raw, "medium");
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toContain(field);
    }
  });

  it("rejects zero or negative minutes", () => {
    const raw = routine(3);
    raw.steps[0].minutes = 0;
    expect(parseRoutine(raw, "medium").ok).toBe(false);
  });
});
