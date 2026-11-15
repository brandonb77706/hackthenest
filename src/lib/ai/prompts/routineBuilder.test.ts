import { describe, expect, it } from "vitest";
import { buildRoutinePrompt, parseRoutine } from "./routineBuilder";

const step = (order: number, text = `Step ${order}`) => ({
  order,
  text,
  minutes: 5,
});

const routine = (count: number) => ({
  title: "Morning",
  steps: Array.from({ length: count }, (_, i) => step(i + 1)),
});

describe("buildRoutinePrompt", () => {
  it("includes what they said and the support level", () => {
    const prompt = buildRoutinePrompt({ goal: "  Get ready for my 9am shift ", supportLevel: "high" });
    expect(prompt).toContain("They said: Get ready for my 9am shift\n");
    expect(prompt).toContain("Support level: high");
    expect(prompt).not.toMatch(/\{\w+\}/);
  });

  it("tells the AI to finish before an event, not start at it", () => {
    const prompt = buildRoutinePrompt({ goal: "get ready for my 9am shift", supportLevel: "low" });
    expect(prompt).toMatch(/start early enough to finish all the steps before it/);
  });

  it("tells the AI not to invent medicine names or doses", () => {
    const prompt = buildRoutinePrompt({ goal: "take my medicine", supportLevel: "high" });
    expect(prompt).toMatch(/Never add a medicine name, dose, or time/);
  });
});

describe("parseRoutine", () => {
  it("accepts a valid routine", () => {
    const result = parseRoutine(routine(4));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Morning");
      expect(result.value.steps).toHaveLength(4);
    }
  });

  it("sorts steps and renumbers them from 1", () => {
    const raw = { title: "T", steps: [step(7, "C"), step(2, "A"), step(5, "B")] };
    const result = parseRoutine(raw);
    expect(result.ok && result.value.steps.map((s) => [s.order, s.text])).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]);
  });

  it("accepts 1 to 15 steps, so a short task like taking medicine isn't rejected", () => {
    expect(parseRoutine(routine(0)).ok).toBe(false);
    expect(parseRoutine(routine(1)).ok).toBe(true);
    expect(parseRoutine(routine(2)).ok).toBe(true);
    expect(parseRoutine(routine(15)).ok).toBe(true);
    expect(parseRoutine(routine(16)).ok).toBe(false);
  });

  it("rejects malformed responses", () => {
    expect(parseRoutine(null).ok).toBe(false);
    expect(parseRoutine("not json").ok).toBe(false);
    expect(parseRoutine([]).ok).toBe(false);
    expect(parseRoutine({ title: "T", steps: "nope" }).ok).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(parseRoutine({ steps: routine(3).steps }).ok).toBe(false);
    expect(parseRoutine({ title: "T" }).ok).toBe(false);

    for (const field of ["text", "minutes"] as const) {
      const raw = routine(3);
      delete (raw.steps[1] as Partial<ReturnType<typeof step>>)[field];
      const result = parseRoutine(raw);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toContain(field);
    }
  });

  it("keeps days and time when the AI sends real ones", () => {
    const result = parseRoutine({ ...routine(2), days: ["fri", "mon"], start_time: "08:30" });
    expect(result.ok && result.value.days).toEqual(["mon", "fri"]);
    expect(result.ok && result.value.start_time).toBe("08:30");
  });

  it("leaves days and time out when they're missing or made up, instead of guessing", () => {
    const missing = parseRoutine(routine(2));
    expect(missing.ok && missing.value).not.toHaveProperty("days");
    expect(missing.ok && missing.value).not.toHaveProperty("start_time");

    const bad = parseRoutine({ ...routine(2), days: ["monday", 3], start_time: "8am" });
    expect(bad.ok).toBe(true);
    expect(bad.ok && bad.value).not.toHaveProperty("days");
    expect(bad.ok && bad.value).not.toHaveProperty("start_time");
  });

  it("doesn't need image prompts while pictures are on hold", () => {
    expect(parseRoutine({ title: "T", steps: [{ order: 1, text: "Do it", minutes: 2 }] }).ok).toBe(true);
  });

  it("rejects zero or negative minutes", () => {
    const raw = routine(3);
    raw.steps[0].minutes = 0;
    expect(parseRoutine(raw).ok).toBe(false);
  });
});
