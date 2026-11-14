import { describe, expect, it } from "vitest";
import { ai } from "./index";
import { AI_CONFIG, type AIFeature } from "./models";
import { parseCameraHelp } from "./prompts/cameraHelp";
import { parseRoutine } from "./prompts/routineBuilder";
import { parseSpeakForMe } from "./prompts/speakForMe";
import { parseStuckHelp } from "./prompts/stuckHelp";
import { createBase44Provider } from "./providers/base44";
import { fakeProvider } from "./providers/mock";

const input = { prompt: "test", schema: {} };

describe("ai.forFeature", () => {
  it("returns a provider for every configured feature", () => {
    for (const feature of Object.keys(AI_CONFIG) as AIFeature[]) {
      const provider = ai.forFeature(feature);
      expect(typeof provider.generateText).toBe("function");
      expect(typeof provider.generateJSON).toBe("function");
    }
  });

  // The sample answers must pass the same checks real answers do,
  // so the app works end to end on mock.
  it("mock routine passes parseRoutine at every support level", async () => {
    const raw = await ai.forFeature("routineBuilder").generateJSON(input);
    for (const level of ["high", "medium", "low"] as const) {
      expect(parseRoutine(raw, level).ok).toBe(true);
    }
  });

  it("mock camera help passes parseCameraHelp", async () => {
    const raw = await ai.forFeature("cameraHelp").generateJSON(input);
    expect(parseCameraHelp(raw).ok).toBe(true);
  });

  it("mock stuck help passes parseStuckHelp", async () => {
    const raw = await ai.forFeature("stuckHelp").generateJSON(input);
    expect(parseStuckHelp(raw).ok).toBe(true);
  });

  it("mock speak for me returns a sentence", async () => {
    const raw = await ai.forFeature("speakForMe").generateText({ prompt: "test" });
    expect(parseSpeakForMe(raw).ok).toBe(true);
  });

  it("mock returns a fresh copy each call", async () => {
    const provider = ai.forFeature("stuckHelp");
    const first = await provider.generateJSON<{ reply: string }>(input);
    first.reply = "changed";
    const second = await provider.generateJSON<{ reply: string }>(input);
    expect(second.reply).not.toBe("changed");
  });
});

describe("fakeProvider", () => {
  it("returns what it was given", async () => {
    const provider = fakeProvider({ json: { a: 1 }, text: "hi" });
    expect(await provider.generateJSON(input)).toEqual({ a: 1 });
    expect(await provider.generateText({ prompt: "x" })).toBe("hi");
  });
});

describe("base44 provider", () => {
  it("fails clearly until Base44 is connected", async () => {
    const provider = createBase44Provider({ feature: "routineBuilder", model: "x" });
    await expect(provider.generateText({ prompt: "x" })).rejects.toThrow(/isn't connected yet/);
    await expect(provider.generateJSON(input)).rejects.toThrow(/routineBuilder/);
  });
});
