import { afterEach, describe, expect, it, vi } from "vitest";
import { pickBrowserVoice, voiceProvider } from "./player";

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
