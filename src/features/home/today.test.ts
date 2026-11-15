import { describe, expect, it } from "vitest";
import { summarizeDay, type DayRoutine } from "./today";

const routine = (id: string, start: string, overrides: Partial<DayRoutine> = {}): DayRoutine => ({
  id,
  title: id,
  tone: "teal",
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  start_time: start,
  active: true,
  step_ids: [`${id}-1`, `${id}-2`],
  ...overrides,
});

const day = (routines: DayRoutine[], done: string[] = []) =>
  summarizeDay({ routines, doneStepIds: new Set(done), weekday: "mon" });

describe("summarizeDay", () => {
  it("orders routines by start time", () => {
    expect(day([routine("evening", "21:00"), routine("morning", "08:00")]).map((r) => r.id)).toEqual(["morning", "evening"]);
  });

  it("marks the first unfinished routine as next and the rest as later", () => {
    const result = day([routine("a", "08:00"), routine("b", "14:00"), routine("c", "21:00")]);
    expect(result.map((r) => r.status)).toEqual(["next", "later", "later"]);
  });

  it("marks a routine done only when every step is finished today", () => {
    const result = day([routine("a", "08:00"), routine("b", "14:00")], ["a-1", "a-2", "b-1"]);
    expect(result.map((r) => [r.status, r.steps_done])).toEqual([
      ["done", 2],
      ["next", 1],
    ]);
  });

  it("moves 'next' along as routines are finished", () => {
    const result = day([routine("a", "08:00"), routine("b", "14:00")], ["a-1", "a-2"]);
    expect(result.map((r) => r.status)).toEqual(["done", "next"]);
  });

  it("marks routines that aren't on today, and never makes them next", () => {
    const result = day([routine("weekend", "07:00", { days: ["sat", "sun"] }), routine("daily", "08:00")]);
    expect(result.map((r) => r.status)).toEqual(["not_today", "next"]);
  });

  it("leaves out routines that are turned off", () => {
    expect(day([routine("off", "08:00", { active: false })])).toEqual([]);
  });

  it("never calls a routine with no steps done", () => {
    expect(day([routine("empty", "08:00", { step_ids: [] })])[0].status).toBe("next");
  });

  it("ignores finished steps from other routines", () => {
    expect(day([routine("a", "08:00")], ["zzz"])[0]).toMatchObject({ steps_done: 0, step_count: 2 });
  });
});
