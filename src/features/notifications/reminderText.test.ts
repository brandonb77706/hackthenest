import { describe, expect, it } from "vitest";
import { reminderText } from "./reminderText";

const r = { id: "x", routineId: "r1", title: "Pick up prescription", dueAt: "", startTime: "14:00" };

describe("reminderText", () => {
  it("says when it starts and how many steps, before the routine", () => {
    expect(reminderText({ ...r, stage: "before", stepCount: 4 })).toEqual({
      title: "Pick up prescription at 2:00 PM",
      body: "Starts in 10 minutes. Ready when you are. It has 4 steps.",
    });
    expect(reminderText({ ...r, stage: "before", stepCount: 1 }).body).toMatch(/1 step\.$/);
  });

  it("is gentle when the routine is late", () => {
    expect(reminderText({ ...r, stage: "late" })).toEqual({
      title: "Time for Pick up prescription",
      body: "No rush. Want to start now, or get help?",
    });
  });
});
