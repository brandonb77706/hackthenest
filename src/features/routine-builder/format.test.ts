import { describe, expect, it } from "vitest";
import { formatDays, formatStepCount, formatTime } from "./format";

describe("formatTime", () => {
  it.each([
    ["00:05", "12:05 AM"],
    ["08:00", "8:00 AM"],
    ["12:30", "12:30 PM"],
    ["21:30", "9:30 PM"],
  ])("%s → %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("returns odd input unchanged instead of crashing", () => {
    expect(formatTime("soon")).toBe("soon");
  });
});

describe("formatDays", () => {
  it("uses plain words for common sets", () => {
    expect(formatDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toBe("Every day");
    expect(formatDays(["mon", "tue", "wed", "thu", "fri"])).toBe("Weekdays");
    expect(formatDays(["sun", "sat"])).toBe("Weekends");
    expect(formatDays([])).toBe("No days set");
  });

  it("lists other days in week order with full names", () => {
    expect(formatDays(["wed", "mon"])).toBe("Monday, Wednesday");
  });
});

describe("formatStepCount", () => {
  it("handles one and many", () => {
    expect(formatStepCount(1)).toBe("1 step");
    expect(formatStepCount(4)).toBe("4 steps");
  });
});
