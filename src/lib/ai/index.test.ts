import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeProvider, ai } from "./index";
import { AI_CONFIG, type AIFeature } from "./models";
import { parseCameraHelp } from "./prompts/cameraHelp";
import { parseRoutine } from "./prompts/routineBuilder";
import { parseSpeakForMe } from "./prompts/speakForMe";
import { parseStuckHelp } from "./prompts/stuckHelp";
import { fakeProvider } from "./providers/mock";

const input = { prompt: "test", schema: {} };

describe("ai.forFeature", () => {
  // Pin "Base44 not set up" so these always get the sample answers.
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "");
    vi.stubEnv("BASE44_APP_ID", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns a provider for every configured feature", () => {
    for (const feature of Object.keys(AI_CONFIG) as AIFeature[]) {
      const provider = ai.forFeature(feature);
      expect(typeof provider.generateText).toBe("function");
      expect(typeof provider.generateJSON).toBe("function");
    }
  });

  // The sample answers must pass the same checks real answers do,
  // so the app works end to end on mock.
  it("mock routine passes parseRoutine", async () => {
    const raw = await ai.forFeature("routineBuilder").generateJSON(input);
    expect(parseRoutine(raw).ok).toBe(true);
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

describe("activeProvider", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses Base44 for the routine builder when an app id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "app123");
    expect(activeProvider("routineBuilder")).toBe("base44");
  });

  it("falls back to sample answers when Base44 isn't set up, so the app still runs", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "");
    vi.stubEnv("BASE44_APP_ID", "");
    expect(activeProvider("routineBuilder")).toBe("mock");
  });

  it("keeps features on the mock until they're switched", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "app123");
    expect(activeProvider("cameraHelp")).toBe("base44");
    expect(activeProvider("stuckHelp")).toBe("mock");
  });
});
