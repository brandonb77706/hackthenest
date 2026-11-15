import { describe, expect, it } from "vitest";
import { biggerSteps, cleanGoal, MAX_GOAL_CHARS, smallerSteps } from "./supportLevel";

describe("smaller and bigger steps", () => {
  it("moves one support level at a time and stops at the ends", () => {
    expect(smallerSteps("low")).toBe("medium");
    expect(smallerSteps("medium")).toBe("high");
    expect(smallerSteps("high")).toBe("high");
    expect(biggerSteps("high")).toBe("medium");
    expect(biggerSteps("medium")).toBe("low");
    expect(biggerSteps("low")).toBe("low");
  });
});

describe("cleanGoal", () => {
  it("trims and squashes spaces", () => {
    expect(cleanGoal("  take   my\nmedicine ")).toBe("take my medicine");
  });

  it("rejects empty, non-text, or too-long goals", () => {
    expect(cleanGoal("   ")).toBeNull();
    expect(cleanGoal(42)).toBeNull();
    expect(cleanGoal("x".repeat(MAX_GOAL_CHARS + 1))).toBeNull();
  });
});
