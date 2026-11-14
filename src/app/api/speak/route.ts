import { cacheKey, getCachedAudio, setCachedAudio } from "@/lib/voice/audioCache";
import { ElevenLabsError, hasElevenLabsKey, synthesize } from "@/lib/voice/elevenlabs";
import { cleanSpeakText, MODEL_ID, pickSpeed, pickVoice } from "@/lib/voice/voices";
import { connectDB, getCurrentUserId, UserProfileModel } from "@/lib/db";

/** The current user's voice and speed, or the defaults if there's no profile or no database. */
async function userVoiceSettings(): Promise<{ voiceId: string; speed: number }> {
  try {
    await connectDB();
    const profile = await UserProfileModel.findOne({ user_id: await getCurrentUserId() }, { voice_id: 1, speech_speed: 1 });
    return { voiceId: pickVoice(profile?.voice_id), speed: pickSpeed(profile?.speech_speed) };
  } catch {
    return { voiceId: pickVoice(undefined), speed: pickSpeed(undefined) };
  }
}

/**
 * Reads text aloud with ElevenLabs: POST { text } → MP3.
 * Uses the user's saved voice and speed. On any error the browser falls back
 * to its own voice, so errors here never leave the person without audio.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = cleanSpeakText(body?.text);
  if (!text) return Response.json({ error: "Nothing to read, or the text is too long" }, { status: 400 });

  if (!hasElevenLabsKey()) return Response.json({ error: "Voice isn't set up" }, { status: 503 });

  const { voiceId, speed } = await userVoiceSettings();
  const key = cacheKey({ text, voiceId, speed, model: MODEL_ID });

  let audio = getCachedAudio(key);
  if (!audio) {
    try {
      audio = await synthesize({ text, voiceId, speed });
    } catch (error) {
      const status = error instanceof ElevenLabsError ? error.status : 0;
      console.error("[speak]", error instanceof Error ? error.message : error);
      return Response.json({ error: "Voice is unavailable right now", upstream: status }, { status: 502 });
    }
    setCachedAudio(key, audio);
  }

  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
  });
}
