// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "@/lib/ai";
import { fakeProvider } from "@/lib/ai/providers/mock";
import { draftRoutine, draftToRoutineInput } from "./aiDraft";
import { checkRoutine } from "./routineInput";

const good = {
  title: "Take medicine",
  steps: [
    { order: 2, text: "Take your pill with water", minutes: 2 },
    { order: 1, text: "Get your pill box", minutes: 1 },
  ],
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  start_time: "08:00",
};

/** A provider that gives each answer in turn. */
function sequence(...answers: unknown[]): AIProvider & { calls: number } {
  const provider = {
    calls: 0,
    async generateText() {
      return "";
    },
    async generateJSON<T>() {
      const answer = answers[Math.min(provider.calls++, answers.length - 1)];
      if (answer instanceof Error) throw answer;
      return structuredClone(answer) as T;
    },
  };
  return provider;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("draftRoutine", () => {
  it("turns a good answer into a routine the editor can open", async () => {
    const result = await draftRoutine("take my medicine every morning", "high", fakeProvider({ json: good }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.routine.goal).toBe("take my medicine every morning");
    expect(result.routine.steps.map((s) => s.text)).toEqual(["Get your pill box", "Take your pill with water"]);
    expect(checkRoutine(result.routine).ok).toBe(true);
  });

  it("sends the goal and support level in the prompt", async () => {
    const generateJSON = vi.fn(async () => good);
    await draftRoutine("get ready for work", "low", { generateText: vi.fn(), generateJSON } as unknown as AIProvider);
    const { prompt } = (generateJSON.mock.calls[0] as unknown as [{ prompt: string }])[0];
    expect(prompt).toContain("They said: get ready for work");
    expect(prompt).toContain("Support level: low");
  });

  it("asks again once when the first answer is bad", async () => {
    const provider = sequence({ title: "No steps" }, good);
    const result = await draftRoutine("pills", "high", provider);
    expect(result.ok).toBe(true);
    expect(provider.calls).toBe(2);
  });

  it("gives up after two bad answers", async () => {
    const provider = sequence("not json", { steps: [] });
    const result = await draftRoutine("pills", "high", provider);
    expect(result).toEqual({ ok: false, reason: "bad_answer" });
    expect(provider.calls).toBe(2);
  });

  it("reports an AI error when the provider keeps failing", async () => {
    const provider = sequence(new Error("down"), new Error("still down"));
    expect(await draftRoutine("pills", "high", provider)).toEqual({ ok: false, reason: "ai_error" });
  });

  it("recovers when the AI fails once and then answers", async () => {
    const provider = sequence(new Error("blip"), good);
    expect((await draftRoutine("pills", "high", provider)).ok).toBe(true);
  });
});

describe("draftToRoutineInput", () => {
  it("defaults to every day at 8:00 when the person didn't say", () => {
    const routine = draftToRoutineInput({ title: "T", steps: [{ order: 1, text: "Do it", minutes: 2 }] }, "g");
    expect(routine.days).toHaveLength(7);
    expect(routine.start_time).toBe("08:00");
  });

  it("keeps days and time the person said", () => {
    const routine = draftToRoutineInput(
      { title: "T", steps: [{ order: 1, text: "Do it", minutes: 2 }], days: ["fri"], start_time: "21:00" },
      "g",
    );
    expect(routine).toMatchObject({ days: ["fri"], start_time: "21:00" });
  });

  it("fits long text and odd minutes into the editor's limits", () => {
    const long = "Put on your clean work shirt and the black pants that are hanging in the closet by the door";
    const routine = draftToRoutineInput(
      {
        title: "A very long routine title that goes on and on past the sixty letter limit",
        steps: [
          { order: 1, text: long, minutes: 0.4 },
          { order: 2, text: "Wait", minutes: 500 },
          { order: 3, text: "Go", minutes: 2.6 },
        ],
      },
      "g",
    );
    expect(routine.title.length).toBeLessThanOrEqual(60);
    expect(routine.steps[0].text.length).toBeLessThanOrEqual(80);
    expect(long.startsWith(routine.steps[0].text)).toBe(true);
    expect(routine.steps[0].text.endsWith(" ")).toBe(false);
    expect(routine.steps.map((s) => s.minutes)).toEqual([1, 120, 3]);
    expect(checkRoutine(routine).ok).toBe(true);
  });
});
