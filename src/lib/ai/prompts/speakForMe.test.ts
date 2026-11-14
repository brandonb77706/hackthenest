import { describe, expect, it } from "vitest";
import { buildSpeakForMePrompt, parseSpeakForMe } from "./speakForMe";

describe("buildSpeakForMePrompt", () => {
  it("includes the user's words", () => {
    expect(buildSpeakForMePrompt({ text: " bus where " })).toContain("someone nearby: bus where\n");
  });
});

describe("parseSpeakForMe", () => {
  it("trims the sentence", () => {
    expect(parseSpeakForMe("  Where is the bus stop?  ")).toEqual({ ok: true, value: "Where is the bus stop?" });
  });

  it("removes wrapping quotes", () => {
    expect(parseSpeakForMe('"Where is the bus stop?"')).toEqual({ ok: true, value: "Where is the bus stop?" });
    expect(parseSpeakForMe("“Hello.”")).toEqual({ ok: true, value: "Hello." });
  });

  it("rejects empty or non-text responses", () => {
    expect(parseSpeakForMe("").ok).toBe(false);
    expect(parseSpeakForMe('""').ok).toBe(false);
    expect(parseSpeakForMe(null).ok).toBe(false);
  });
});
