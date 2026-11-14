import { beforeEach, describe, expect, it } from "vitest";
import { cacheKey, clearAudioCache, getCachedAudio, setCachedAudio } from "./audioCache";

const key = (text: string, speed = 0.9) => cacheKey({ text, voiceId: "v", speed, model: "m" });

beforeEach(() => clearAudioCache());

describe("audio cache", () => {
  it("returns what was stored for the same text, voice, speed, and model", () => {
    const audio = new ArrayBuffer(4);
    setCachedAudio(key("Hello"), audio);
    expect(getCachedAudio(key("Hello"))).toBe(audio);
    expect(getCachedAudio(key("Hello", 1))).toBeUndefined();
  });

  it("drops the least recently used entry when full", () => {
    for (let i = 0; i < 200; i++) setCachedAudio(key(`t${i}`), new ArrayBuffer(1));
    getCachedAudio(key("t0")); // used recently, so it stays
    setCachedAudio(key("new"), new ArrayBuffer(1));
    expect(getCachedAudio(key("t0"))).toBeDefined();
    expect(getCachedAudio(key("t1"))).toBeUndefined();
    expect(getCachedAudio(key("new"))).toBeDefined();
  });
});
