import { describe, expect, it } from "vitest";
import { checkRoutine } from "./routineInput";
import { BLANK_TEMPLATE_ID, startingRoutine, TEMPLATES } from "./templates";

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.id, t]))("%s is a valid routine", (_id, template) => {
    expect(checkRoutine(template.routine).ok).toBe(true);
  });

  it("have unique ids that are safe in a URL", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(ids).not.toContain(BLANK_TEMPLATE_ID);
  });

  it("include take medicine without naming any medicine or dose", () => {
    const medicine = startingRoutine("take-medicine");
    expect(medicine).not.toBeNull();
    expect(JSON.stringify(medicine)).not.toMatch(/\d+\s*mg|ibuprofen|tylenol|aspirin/i);
  });
});

describe("startingRoutine", () => {
  it("gives a blank routine with one empty step to type in", () => {
    const blank = startingRoutine(BLANK_TEMPLATE_ID);
    expect(blank?.title).toBe("");
    expect(blank?.steps).toEqual([{ text: "", minutes: 5 }]);
  });

  it("returns null for an unknown template", () => {
    expect(startingRoutine("nope")).toBeNull();
  });

  it("returns a copy, so editing it doesn't change the template", () => {
    const copy = startingRoutine("morning")!;
    copy.steps[0].text = "changed";
    expect(startingRoutine("morning")!.steps[0].text).not.toBe("changed");
  });
});
