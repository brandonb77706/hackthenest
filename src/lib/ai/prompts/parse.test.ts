import { describe, expect, it } from "vitest";
import { fillTemplate, isNonEmptyString, isPositiveNumber, isRecord } from "./parse";

describe("fillTemplate", () => {
  it("fills known placeholders", () => {
    expect(fillTemplate("Goal: {goal}, {n}", { goal: "work", n: 3 })).toBe("Goal: work, 3");
  });

  it("leaves unknown placeholders alone", () => {
    expect(fillTemplate("{a} {b}", { a: "x" })).toBe("x {b}");
  });

  it("doesn't treat user text as a placeholder", () => {
    expect(fillTemplate("{goal}", { goal: "{goal}" })).toBe("{goal}");
  });
});

describe("type checks", () => {
  it("isRecord", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });

  it("isNonEmptyString", () => {
    expect(isNonEmptyString("a")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(3)).toBe(false);
  });

  it("isPositiveNumber", () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(Number.NaN)).toBe(false);
    expect(isPositiveNumber("5")).toBe(false);
  });
});
