import { describe, expect, it } from "vitest";
import { cleanName, NAME_MAX, needsWelcome, parseWelcomeInput, suggestedName } from "./welcome";

describe("cleanName", () => {
  it("tidies spaces and keeps the name", () => {
    expect(cleanName("  Jordan   Lee ")).toBe("Jordan Lee");
  });
  it("rejects empty and non-text input", () => {
    for (const v of ["", "   ", "\n\t", null, undefined, 5]) expect(cleanName(v)).toBeNull();
  });
  it("caps the length", () => {
    expect(cleanName("a".repeat(80))).toHaveLength(NAME_MAX);
  });
});

describe("suggestedName", () => {
  it("prefers the name already on the profile, like one a guardian gave", () => {
    expect(suggestedName({ profileName: "Jo", accountName: "Jordan Lee", email: "j@x.com" })).toBe("Jo");
  });
  it("uses the Google name when there's no profile yet", () => {
    expect(suggestedName({ profileName: null, accountName: "Jordan Lee", email: "jlee@x.com" })).toBe("Jordan Lee");
  });
  it("doesn't suggest the placeholders made at sign-up", () => {
    expect(suggestedName({ profileName: "Friend", accountName: "Jordan", email: "jordan@example.com" })).toBe("");
  });
});

describe("needsWelcome", () => {
  it("is true until Welcome is finished", () => {
    expect(needsWelcome(null)).toBe(true);
    expect(needsWelcome({})).toBe(true);
    expect(needsWelcome({ onboarded: false })).toBe(true);
    expect(needsWelcome({ onboarded: true })).toBe(false);
  });
});

describe("parseWelcomeInput", () => {
  it("accepts a name and Buddy", () => {
    expect(parseWelcomeInput({ name: " Sam ", avatar_id: "a1" })).toEqual({
      ok: true,
      value: { name: "Sam", avatar_id: "a1" },
    });
  });
  it("explains what's missing in plain words", () => {
    expect(parseWelcomeInput({ name: "", avatar_id: "a1" })).toEqual({ ok: false, error: "Please type your name." });
    expect(parseWelcomeInput({ name: "Sam" })).toEqual({ ok: false, error: "Please pick a Buddy." });
    expect(parseWelcomeInput(null).ok).toBe(false);
  });
});
