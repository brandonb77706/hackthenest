import { describe, expect, it } from "vitest";
import { greeting, localNow } from "./time";

describe("localNow", () => {
  it("reads the date, weekday, and time in the user's zone", () => {
    // 14:30 UTC on Monday 16 Nov 2026 is 08:30 in Chicago.
    expect(localNow(new Date("2026-11-16T14:30:00Z"), "America/Chicago")).toEqual({
      date: "2026-11-16",
      weekday: "mon",
      minutes: 8 * 60 + 30,
    });
  });

  it("can be a different day than UTC", () => {
    expect(localNow(new Date("2026-11-17T03:00:00Z"), "America/Los_Angeles")).toMatchObject({
      date: "2026-11-16",
      weekday: "mon",
    });
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(localNow(new Date("2026-11-16T14:30:00Z"), "Not/AZone").minutes).toBe(14 * 60 + 30);
  });
});

describe("greeting", () => {
  it("matches the time of day", () => {
    expect(greeting(8)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(20)).toBe("Good evening");
  });
});
