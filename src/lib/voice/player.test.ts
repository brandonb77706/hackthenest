import { afterEach, describe, expect, it, vi } from "vitest";
import { pickBrowserVoice, splitForSpeech, voiceProvider } from "./player";

afterEach(() => vi.unstubAllEnvs());

describe("voiceProvider", () => {
  it("follows NEXT_PUBLIC_VOICE_PROVIDER when it's set", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "browser");
    expect(voiceProvider()).toBe("browser");
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "elevenlabs");
    vi.stubEnv("NODE_ENV", "development");
    expect(voiceProvider()).toBe("elevenlabs");
  });

  it("uses the free browser voice in npm run dev when not set, so testing doesn't use credits", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(voiceProvider()).toBe("browser");
  });

  it("uses ElevenLabs when deployed and not set", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(voiceProvider()).toBe("elevenlabs");
  });
});

describe("pickBrowserVoice", () => {
  const v = (name: string, lang: string, localService = true) => ({ name, lang, localService }) as SpeechSynthesisVoice;

  it("prefers Chrome's Google US English", () => {
    expect(pickBrowserVoice([v("Alex", "en-US"), v("Google US English", "en-US", false)])?.name).toBe("Google US English");
  });

  it("otherwise picks an on-device US English voice, then any English voice", () => {
    expect(pickBrowserVoice([v("Thomas", "fr-FR"), v("Samantha", "en-US")])?.name).toBe("Samantha");
    expect(pickBrowserVoice([v("Thomas", "fr-FR"), v("Daniel", "en-GB")])?.name).toBe("Daniel");
  });

  it("returns nothing when there's no English voice, so the browser default is used", () => {
    expect(pickBrowserVoice([v("Thomas", "fr-FR")])).toBeUndefined();
    expect(pickBrowserVoice([])).toBeUndefined();
  });
});

describe("splitForSpeech", () => {
  it("keeps short text as one piece", () => {
    expect(splitForSpeech("Brush your teeth")).toEqual(["Brush your teeth"]);
  });

  it("splits long text at the ends of sentences, packing them up to the limit", () => {
    const text = "Electric bill from DTE. You owe $84.12. Here's what to do. 1. Pay by November 28.";
    expect(splitForSpeech(text)).toEqual([text]);
    expect(splitForSpeech(text, 40)).toEqual(["Electric bill from DTE. You owe $84.12.", "Here's what to do. 1.", "Pay by November 28."]);
  });

  it("never splits inside a number like $84.12", () => {
    for (const piece of splitForSpeech("You owe $84.12 today. Thanks.", 20)) expect(piece).not.toMatch(/\$84\.$/);
  });

  it("breaks a very long sentence at commas or spaces, never past the limit", () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(", ") + ".";
    const pieces = splitForSpeech(long, 60);
    expect(pieces.length).toBeGreaterThan(1);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(60);
    expect(pieces.join(" ").replace(/\s+/g, " ")).toBe(long);
  });

  it("returns nothing for empty text", () => {
    expect(splitForSpeech("   ")).toEqual([]);
  });
});
