import { describe, expect, it } from "vitest";
import { routineIcon } from "./routineIcon";

describe("routineIcon", () => {
  it("is a sun in the morning, a star in the afternoon, and a moon in the evening", () => {
    expect(routineIcon("08:00")).toBe("sun");
    expect(routineIcon("14:00")).toBe("star");
    expect(routineIcon("21:00")).toBe("moon");
  });

  it("falls back to a star for an odd time", () => {
    expect(routineIcon("soon")).toBe("star");
  });
});
