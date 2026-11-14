// Small in-memory cache so the same step read twice doesn't use ElevenLabs credits
// twice. It lives as long as the server process.

const MAX_ENTRIES = 200;
const cache = new Map<string, ArrayBuffer>();

export function cacheKey(parts: { text: string; voiceId: string; speed: number; model: string }): string {
  return [parts.model, parts.voiceId, parts.speed.toFixed(2), parts.text].join("|");
}

export function getCachedAudio(key: string): ArrayBuffer | undefined {
  const audio = cache.get(key);
  if (audio) {
    // Mark as recently used.
    cache.delete(key);
    cache.set(key, audio);
  }
  return audio;
}

export function setCachedAudio(key: string, audio: ArrayBuffer): void {
  cache.set(key, audio);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function clearAudioCache(): void {
  cache.clear();
}
