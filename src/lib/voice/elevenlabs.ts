// ElevenLabs text-to-speech. Server code only: it uses the secret API key.

import { MODEL_ID } from "./voices";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export function hasElevenLabsKey(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** Returns MP3 audio for the text. Throws ElevenLabsError if ElevenLabs says no. */
export async function synthesize(input: { text: string; voiceId: string; speed: number }): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError("ELEVENLABS_API_KEY is not set", 503);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_64`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: input.text, model_id: MODEL_ID, voice_settings: { speed: input.speed } }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ElevenLabsError(`ElevenLabs answered ${response.status}: ${detail.slice(0, 200)}`, response.status);
  }
  return response.arrayBuffer();
}
