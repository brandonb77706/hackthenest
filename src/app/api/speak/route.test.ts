// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => {}),
  getCurrentUserId: vi.fn(async () => "user-1"),
  UserProfileModel: { findOne: (...args: unknown[]) => findOne(...args) },
}));
vi.mock("@/lib/voice/elevenlabs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voice/elevenlabs")>()),
  hasElevenLabsKey: vi.fn(() => true),
  synthesize: vi.fn(async () => new Uint8Array([9, 9]).buffer),
}));

import { clearAudioCache } from "@/lib/voice/audioCache";
import * as el from "@/lib/voice/elevenlabs";
import { DEFAULT_VOICE_ID, VOICES } from "@/lib/voice/voices";
import { POST } from "./route";

const speak = (body: unknown) =>
  POST(new Request("http://test/api/speak", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  clearAudioCache();
  vi.mocked(el.hasElevenLabsKey).mockReturnValue(true);
  findOne.mockResolvedValue(null);
});

describe("POST /api/speak", () => {
  it("returns MP3 audio for the text", async () => {
    const res = await speak({ text: "Get your pill box" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect((await res.arrayBuffer()).byteLength).toBe(2);
  });

  it("uses the user's saved voice and speed", async () => {
    findOne.mockResolvedValue({ voice_id: VOICES[2].id, speech_speed: 1.1 });
    await speak({ text: "Hello" });
    expect(el.synthesize).toHaveBeenCalledWith({ text: "Hello", voiceId: VOICES[2].id, speed: 1.1 });
    expect(findOne).toHaveBeenCalledWith({ user_id: "user-1" }, expect.anything());
  });

  it("falls back to the default voice when the profile has none or the database is down", async () => {
    findOne.mockRejectedValue(new Error("no database"));
    await speak({ text: "Hello" });
    expect(el.synthesize).toHaveBeenCalledWith({ text: "Hello", voiceId: DEFAULT_VOICE_ID, speed: 0.9 });
  });

  it("reuses audio for the same text instead of using credits again", async () => {
    await speak({ text: "Same step" });
    await speak({ text: "Same step" });
    expect(el.synthesize).toHaveBeenCalledOnce();
  });

  it("rejects empty or too-long text without calling ElevenLabs", async () => {
    expect((await speak({ text: "  " })).status).toBe(400);
    expect((await speak({ text: "x".repeat(301) })).status).toBe(400);
    expect((await speak(null)).status).toBe(400);
    expect(el.synthesize).not.toHaveBeenCalled();
  });

  it("answers 503 when no key is set", async () => {
    vi.mocked(el.hasElevenLabsKey).mockReturnValue(false);
    expect((await speak({ text: "Hello" })).status).toBe(503);
  });

  it("answers 502 when ElevenLabs fails, so the browser uses its own voice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(el.synthesize).mockRejectedValue(new el.ElevenLabsError("no credits", 402));
    const res = await speak({ text: "Hello" });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ upstream: 402 });
  });
});
