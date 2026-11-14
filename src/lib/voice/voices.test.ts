import { describe, expect, it } from "vitest";
import { cleanSpeakText, DEFAULT_VOICE_ID, isKnownVoice, MAX_SPEAK_CHARS, pickSpeed, pickVoice, VOICES } from "./voices";

describe("voices", () => {
  it("has unique ids and includes the default", () => {
    const ids = VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_VOICE_ID);
  });

  it("picks a known voice, or the default for unknown or empty ones", () => {
    expect(pickVoice(VOICES[1].id)).toBe(VOICES[1].id);
    expect(pickVoice("")).toBe(DEFAULT_VOICE_ID);
    expect(pickVoice("l7mlSJVCAXDwFX44amqm")).toBe(DEFAULT_VOICE_ID); // library voice, needs a paid plan
    expect(pickVoice(undefined)).toBe(DEFAULT_VOICE_ID);
    expect(isKnownVoice(42)).toBe(false);
  });
});

describe("pickSpeed", () => {
  it("keeps speed between 0.7 and 1.2", () => {
    expect(pickSpeed(0.3)).toBe(0.7);
    expect(pickSpeed(2)).toBe(1.2);
    expect(pickSpeed(1)).toBe(1);
  });

  it("rounds to 0.05 and defaults to 0.9", () => {
    expect(pickSpeed(0.93)).toBe(0.95);
    expect(pickSpeed(undefined)).toBe(0.9);
    expect(pickSpeed(Number.NaN)).toBe(0.9);
  });
});

describe("cleanSpeakText", () => {
  it("trims and squashes spaces", () => {
    expect(cleanSpeakText("  Get   your\npill box ")).toBe("Get your pill box");
  });

  it("rejects empty, non-text, or too-long text", () => {
    expect(cleanSpeakText("   ")).toBeNull();
    expect(cleanSpeakText(5)).toBeNull();
    expect(cleanSpeakText("x".repeat(MAX_SPEAK_CHARS + 1))).toBeNull();
    expect(cleanSpeakText("x".repeat(MAX_SPEAK_CHARS))).not.toBeNull();
  });
});
