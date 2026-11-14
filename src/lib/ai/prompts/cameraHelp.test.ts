import { describe, expect, it } from "vitest";
import { parseCameraHelp } from "./cameraHelp";

const valid = () => ({
  what_it_is: "An electric bill.",
  summary: "You owe $48.20.",
  actions: ["Pay the bill"],
  deadlines: [{ title: "Pay bill", date: "2026-12-01" }],
  confident: true,
});

describe("parseCameraHelp", () => {
  it("accepts a valid response", () => {
    const result = parseCameraHelp(valid());
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.deadlines).toEqual([{ title: "Pay bill", date: "2026-12-01" }]);
  });

  it("accepts an unclear photo with no actions or deadlines", () => {
    const raw = { ...valid(), actions: [], deadlines: [], confident: false };
    expect(parseCameraHelp(raw).ok).toBe(true);
  });

  it("drops deadlines with bad or impossible dates instead of guessing", () => {
    const raw = {
      ...valid(),
      deadlines: [
        { title: "Good", date: "2026-12-01" },
        { title: "Words", date: "next Friday" },
        { title: "Impossible", date: "2026-02-30" },
        { title: "", date: "2026-12-02" },
        "not an object",
      ],
    };
    const result = parseCameraHelp(raw);
    expect(result.ok && result.value.deadlines.map((d) => d.title)).toEqual(["Good"]);
  });

  it("rejects malformed responses", () => {
    expect(parseCameraHelp(null).ok).toBe(false);
    expect(parseCameraHelp("text").ok).toBe(false);
    expect(parseCameraHelp({ ...valid(), actions: "Pay it" }).ok).toBe(false);
    expect(parseCameraHelp({ ...valid(), actions: ["ok", 3] }).ok).toBe(false);
    expect(parseCameraHelp({ ...valid(), confident: "yes" }).ok).toBe(false);
  });

  it("rejects missing fields", () => {
    for (const field of ["what_it_is", "summary", "actions", "deadlines", "confident"] as const) {
      const raw: Partial<ReturnType<typeof valid>> = valid();
      delete raw[field];
      const result = parseCameraHelp(raw);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toContain(field);
    }
  });
});
