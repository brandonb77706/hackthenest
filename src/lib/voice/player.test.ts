import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickBrowserVoice, splitForSpeech, voiceProvider } from "./player";
import { MAX_SPEAK_CHARS } from "./voices";

afterEach(() => vi.unstubAllEnvs());

describe("voiceProvider", () => {
  it("follows NEXT_PUBLIC_VOICE_PROVIDER when it's set", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "browser");
    expect(voiceProvider()).toBe("browser");
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "elevenlabs");
    vi.stubEnv("NODE_ENV", "development");
    expect(voiceProvider()).toBe("elevenlabs");
  });

  it("uses ElevenLabs in npm run dev too when not set", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(voiceProvider()).toBe("elevenlabs");
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

describe("play with ElevenLabs", () => {
  // A fake <audio>: play() starts it, and the test ends each clip by calling finishClip().
  const clips: { url: string; end: () => void }[] = [];
  class FakeAudio {
    onended: (() => void) | null = null;
    onpause: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public url: string) {}
    play() {
      clips.push({ url: this.url, end: () => this.onended?.() });
      return Promise.resolve();
    }
    pause() {
      this.onpause?.();
    }
  }
  const sentText: string[] = [];
  const spoken: string[] = [];
  let failOn: string | null = null;

  async function flush() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }
  async function finishClip() {
    await vi.waitFor(() => expect(clips.length).toBeGreaterThan(0));
    clips.shift()!.end();
    await flush();
  }

  beforeEach(async () => {
    clips.length = 0;
    sentText.length = 0;
    spoken.length = 0;
    failOn = null;
    vi.stubEnv("NEXT_PUBLIC_VOICE_PROVIDER", "elevenlabs");
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("URL", { ...URL, createObjectURL: (b: Blob & { text_?: string }) => `blob:${b.text_}` });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const { text } = JSON.parse(String(init.body)) as { text: string };
        sentText.push(text);
        if (text === failOn) return new Response(null, { status: 502 });
        const blob = Object.assign(new Blob(["mp3"]), { text_: text });
        return { ok: true, blob: async () => blob } as unknown as Response;
      }),
    );
    vi.stubGlobal("speechSynthesis", {
      speaking: false,
      pending: false,
      cancel: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
      speak: (u: { text: string }) => spoken.push(u.text),
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    const { resetPlayer } = await import("./player");
    resetPlayer();
  });
  afterEach(() => vi.unstubAllGlobals());

  // About 900 characters, like a scanned letter read in full.
  const letter = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} explains one more part of the letter for you.`).join(" ");

  it("reads long text in pieces ElevenLabs accepts, in order, all in the same voice", async () => {
    const { play, getPlayerState } = await import("./player");
    const done = play(letter);
    for (let i = 0; i < 10 && getPlayerState().status !== "idle"; i++) await finishClip();
    await done;

    expect(sentText.length).toBeGreaterThan(1);
    for (const piece of sentText) expect(piece.length).toBeLessThanOrEqual(MAX_SPEAK_CHARS);
    expect(sentText.join(" ")).toBe(letter);
    expect(spoken).toEqual([]);
    expect(getPlayerState()).toEqual({ status: "idle", text: null });
  });

  it("shows the whole text as playing until the last piece ends", async () => {
    const { play, getPlayerState } = await import("./player");
    void play(letter);
    await finishClip();
    expect(getPlayerState()).toEqual({ status: "playing", text: letter });
  });

  it("reads short text in one request, like before", async () => {
    const { play, getPlayerState } = await import("./player");
    const done = play("Brush your teeth.");
    await finishClip();
    await done;
    expect(sentText).toEqual(["Brush your teeth."]);
    expect(getPlayerState().status).toBe("idle");
  });

  it("reads the rest with the browser's voice if ElevenLabs fails partway", async () => {
    const { play, splitForSpeech } = await import("./player");
    const pieces = splitForSpeech(letter, MAX_SPEAK_CHARS);
    failOn = pieces[1];
    const done = play(letter);
    await finishClip();
    await done;
    expect(spoken.join(" ")).toBe(pieces.slice(1).join(" "));
  });

  it("stops the queue when the person taps stop", async () => {
    const { play, stop, getPlayerState } = await import("./player");
    const done = play(letter);
    await vi.waitFor(() => expect(clips.length).toBe(1));
    stop();
    await done;
    await flush();
    expect(clips.length).toBe(1);
    expect(spoken).toEqual([]);
    expect(getPlayerState()).toEqual({ status: "idle", text: null });
  });
});
