// Voices people can choose from. Voice IDs aren't secret, so they live here in git.
// Only ELEVENLABS_API_KEY is secret (in .env.local).

export interface Voice {
  id: string;
  name: string;
  description: string;
}

/**
 * ElevenLabs' built-in voices, which work on the free plan. Free accounts can't
 * use voice-library voices through the API ("payment required").
 *
 * After upgrading the ElevenLabs plan, these library voices can be added:
 *   { id: "l7mlSJVCAXDwFX44amqm", name: "Curtis", description: "Warm, friendly, confident" },
 *   { id: "zs057lc0shdaAFXkm2Fm", name: "Patrick", description: "Calm narrator" },
 *   { id: "PStJ2DzQnh8zxG5PDf1s", name: "Lyan", description: "Warm, casual" },
 *   { id: "MKlLqCItoCkvdhrxgtLv", name: "Grampa Werthers", description: "Old and cranky" },
 */
export const VOICES: Voice[] = [
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", description: "Charming and down-to-earth" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", description: "Smooth and trustworthy" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", description: "Relaxed and calm" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Reassuring and warm" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", description: "Clear, British accent" },
];

export const DEFAULT_VOICE_ID = "iP95p4xoKVk53GoZ742B"; // Chris

/** Fast, low-cost model. It answered a short step in under 200ms in testing. */
export const MODEL_ID = "eleven_flash_v2_5";

/** Matches UserProfile.speech_speed. */
export const SPEED = { min: 0.7, max: 1.2, default: 0.9 } as const;

/** Longest text one request can read. Keeps one request from using lots of credits. */
export const MAX_SPEAK_CHARS = 300;

export function isKnownVoice(id: unknown): id is string {
  return typeof id === "string" && VOICES.some((v) => v.id === id);
}

/** A known voice, or the default. Profiles may hold an old or empty voice id. */
export function pickVoice(id: unknown): string {
  return isKnownVoice(id) ? id : DEFAULT_VOICE_ID;
}

/** Keeps speed in range, rounded to 0.05 so the cache gets more hits. */
export function pickSpeed(speed: unknown): number {
  if (typeof speed !== "number" || !Number.isFinite(speed)) return SPEED.default;
  const clamped = Math.min(SPEED.max, Math.max(SPEED.min, speed));
  return Math.round(clamped * 20) / 20;
}

/** The text to read, cleaned up, or null if there's nothing to read or it's too long. */
export function cleanSpeakText(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > MAX_SPEAK_CHARS) return null;
  return cleaned;
}
