import { describe, expect, it } from "vitest";
import { buildStuckHelpPrompt, parseStuckHelp } from "./stuckHelp";

describe("buildStuckHelpPrompt", () => {
  it("includes the step, what they said, and the try number", () => {
    const prompt = buildStuckHelpPrompt({ stepText: "Put on your shirt", userMessage: "I can't find it", attempt: 2 });
    expect(prompt).toContain("stuck on this step: Put on your shirt");
    expect(prompt).toContain("They said: I can't find it");
    expect(prompt).toContain("try number 2");
    expect(prompt).not.toMatch(/\{\w+\}/);
  });
});

describe("parseStuckHelp", () => {
  const valid = { reply: "Let's look on the bed.", emergency: false, offer_contact: false };

  it("accepts a valid response", () => {
    expect(parseStuckHelp(valid)).toEqual({ ok: true, value: valid });
  });

  it("keeps emergency: true", () => {
    const result = parseStuckHelp({ ...valid, emergency: true });
    expect(result.ok && result.value.emergency).toBe(true);
  });

  it("rejects malformed responses", () => {
    expect(parseStuckHelp(null).ok).toBe(false);
    expect(parseStuckHelp({ ...valid, emergency: "true" }).ok).toBe(false);
    expect(parseStuckHelp({ ...valid, reply: "  " }).ok).toBe(false);
  });

  it("rejects missing fields", () => {
    for (const field of ["reply", "emergency", "offer_contact"] as const) {
      const raw: Partial<typeof valid> = { ...valid };
      delete raw[field];
      expect(parseStuckHelp(raw).ok).toBe(false);
    }
  });
});
