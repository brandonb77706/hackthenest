// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsError, synthesize } from "./elevenlabs";
import { MODEL_ID } from "./voices";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("synthesize", () => {
  it("calls ElevenLabs with the key, voice, model, and speed", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const audio = await synthesize({ text: "Get your pill box", voiceId: "voice1", speed: 0.9 });

    expect(audio.byteLength).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/text-to-speech/voice1");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    expect(JSON.parse(init.body as string)).toEqual({
      text: "Get your pill box",
      model_id: MODEL_ID,
      voice_settings: { speed: 0.9 },
    });
  });

  it("throws with ElevenLabs' status when it says no", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("payment required", { status: 402 })));
    await expect(synthesize({ text: "x", voiceId: "v", speed: 1 })).rejects.toMatchObject({
      name: "ElevenLabsError",
      status: 402,
    });
  });

  it("fails clearly without a key and never calls ElevenLabs", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(synthesize({ text: "x", voiceId: "v", speed: 1 })).rejects.toBeInstanceOf(ElevenLabsError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
