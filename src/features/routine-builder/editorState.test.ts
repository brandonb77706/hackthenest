import { describe, expect, it } from "vitest";
import { editorReducer, toEditorState, toRoutineInput, type EditorState } from "./editorState";
import { LIMITS } from "./routineInput";

const start = (texts = ["A", "B", "C"]): EditorState =>
  toEditorState({
    title: "T",
    goal: "",
    days: ["mon"],
    start_time: "08:00",
    steps: texts.map((text) => ({ text, minutes: 5 })),
  });

const texts = (s: EditorState) => s.steps.map((step) => step.text);

describe("editorReducer", () => {
  it("edits a step's text and minutes", () => {
    let s = editorReducer(start(), { type: "setStepText", index: 1, text: "Changed" });
    s = editorReducer(s, { type: "setStepMinutes", index: 1, minutes: 9 });
    expect(s.steps[1]).toMatchObject({ text: "Changed", minutes: 9 });
    expect(texts(s)).toEqual(["A", "Changed", "C"]);
  });

  it("adds an empty step at the end, up to the limit", () => {
    expect(texts(editorReducer(start(), { type: "addStep" }))).toEqual(["A", "B", "C", ""]);
    const full = start(Array.from({ length: LIMITS.stepsMax }, (_, i) => `S${i}`));
    expect(editorReducer(full, { type: "addStep" }).steps).toHaveLength(LIMITS.stepsMax);
  });

  it("removes a step but always keeps one", () => {
    expect(texts(editorReducer(start(), { type: "removeStep", index: 1 }))).toEqual(["A", "C"]);
    const one = start(["Only"]);
    expect(editorReducer(one, { type: "removeStep", index: 0 })).toBe(one);
  });

  it("moves steps up and down, and ignores moves past the ends", () => {
    expect(texts(editorReducer(start(), { type: "moveStep", index: 2, direction: "up" }))).toEqual(["A", "C", "B"]);
    expect(texts(editorReducer(start(), { type: "moveStep", index: 0, direction: "down" }))).toEqual(["B", "A", "C"]);
    const s = start();
    expect(editorReducer(s, { type: "moveStep", index: 0, direction: "up" })).toBe(s);
    expect(editorReducer(s, { type: "moveStep", index: 2, direction: "down" })).toBe(s);
  });

  it("keeps each step's key when it moves, so React keeps focus on it", () => {
    const s = start();
    const keyOfB = s.steps[1].key;
    const moved = editorReducer(s, { type: "moveStep", index: 1, direction: "up" });
    expect(moved.steps[0].key).toBe(keyOfB);
  });

  it("toggles days in week order and sets every day", () => {
    let s = editorReducer(start(), { type: "toggleDay", day: "sun" });
    s = editorReducer(s, { type: "toggleDay", day: "wed" });
    expect(s.days).toEqual(["mon", "wed", "sun"]);
    expect(editorReducer(s, { type: "toggleDay", day: "mon" }).days).toEqual(["wed", "sun"]);
    expect(editorReducer(s, { type: "setEveryDay", on: true }).days).toHaveLength(7);
    expect(editorReducer(s, { type: "setEveryDay", on: false }).days).toEqual([]);
  });

  it("sets the title and time", () => {
    let s = editorReducer(start(), { type: "setTitle", title: "New" });
    s = editorReducer(s, { type: "setTime", time: "09:15" });
    expect(s).toMatchObject({ title: "New", start_time: "09:15" });
  });
});

describe("toRoutineInput", () => {
  it("drops the editor-only keys and keeps saved step ids", () => {
    const s = toEditorState({
      title: "T",
      goal: "g",
      days: ["mon"],
      start_time: "08:00",
      steps: [{ id: "saved1", text: "A", minutes: 1 }, { text: "B", minutes: 2 }],
    });
    expect(toRoutineInput(s).steps).toEqual([{ id: "saved1", text: "A", minutes: 1 }, { text: "B", minutes: 2 }]);
  });
});
