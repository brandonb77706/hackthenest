// Plays text aloud in the browser. Only one thing plays at a time.
// Tries ElevenLabs (through /api/speak) first, then the browser's own voice.
//
// Which voice to use is set by NEXT_PUBLIC_VOICE_PROVIDER:
//   "browser"     the browser's free voice only. Never calls ElevenLabs (saves credits).
//   "elevenlabs"  ElevenLabs, with the browser voice as backup.
//   not set       ElevenLabs, everywhere (npm run dev too).

export type PlayerStatus = "idle" | "loading" | "playing";

export interface PlayerState {
  status: PlayerStatus;
  /** What's loading or playing */
  text: string | null;
}

export type VoiceProvider = "browser" | "elevenlabs";

const FALLBACK_RATE = 0.9;

export function voiceProvider(): VoiceProvider {
  const setting = process.env.NEXT_PUBLIC_VOICE_PROVIDER;
  if (setting === "browser" || setting === "elevenlabs") return setting;
  return "elevenlabs";
}

/**
 * A clear English voice if the browser has one ("Google US English" in Chrome),
 * otherwise any English voice, otherwise the browser's default.
 */
export function pickBrowserVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  return (
    english.find((v) => v.name === "Google US English") ??
    english.find((v) => v.lang === "en-US" && v.localService) ??
    english.find((v) => v.lang === "en-US") ??
    english[0]
  );
}

let state: PlayerState = { status: "idle", text: null };
const listeners = new Set<() => void>();
/** Text → audio URL, so repeating a step doesn't use ElevenLabs credits again. */
const audioUrls = new Map<string, string>();
let audio: HTMLAudioElement | null = null;
/** Increases on every play or stop, so a slow request can't start playing after a newer one. */
let playId = 0;

function setState(next: PlayerState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getPlayerState(): PlayerState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Splits text into sentence-sized pieces for the browser voice. Browsers
 * (especially Chrome's Google voices) silently stop on long text, so long
 * text is read as a queue of short pieces instead.
 */
export function splitForSpeech(text: string, max = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // A sentence ends at . ! or ? followed by a space, so "$84.12" stays whole.
  const sentences = clean.split(/(?<=[.!?]["')\]]*)\s+/);

  // Break any sentence longer than max at commas, then at spaces.
  const parts: string[] = [];
  for (const sentence of sentences) {
    let rest = sentence;
    while (rest.length > max) {
      const comma = rest.lastIndexOf(", ", max - 1);
      const space = rest.lastIndexOf(" ", max);
      const cut = comma > max / 3 ? comma + 1 : space > max / 3 ? space : max;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
  }

  // Pack sentences back together up to max, so short bits like "1." don't make odd pauses.
  const pieces: string[] = [];
  for (const part of parts) {
    const last = pieces[pieces.length - 1];
    if (last && last.length + 1 + part.length <= max) pieces[pieces.length - 1] = `${last} ${part}`;
    else pieces.push(part);
  }
  return pieces;
}

export function stop(): void {
  playId++;
  audio?.pause();
  audio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const synth = window.speechSynthesis;
    // Only cancel when something is queued: Chrome can drop speech that starts right after a cancel.
    if (synth.speaking || synth.pending) synth.cancel();
  }
  setState({ status: "idle", text: null });
}

async function fetchAudioUrl(text: string): Promise<string | null> {
  const cached = audioUrls.get(text);
  if (cached) return cached;
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const url = URL.createObjectURL(await response.blob());
    audioUrls.set(text, url);
    return url;
  } catch {
    return null;
  }
}

function speakWithBrowser(text: string, id: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    setState({ status: "idle", text: null });
    return;
  }
  const synth = window.speechSynthesis;
  const voice = pickBrowserVoice(synth.getVoices?.() ?? []);
  const pieces = splitForSpeech(text);
  if (pieces.length === 0) {
    setState({ status: "idle", text: null });
    return;
  }
  const done = () => {
    if (id === playId) setState({ status: "idle", text: null });
  };
  setState({ status: "playing", text });
  // Chrome sometimes leaves speech paused; resume before queueing.
  synth.resume?.();
  pieces.forEach((piece, i) => {
    const utterance = new SpeechSynthesisUtterance(piece);
    utterance.rate = FALLBACK_RATE;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    if (i === pieces.length - 1) utterance.onend = done;
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" happen when the person taps stop or plays something else.
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason !== "interrupted" && reason !== "canceled") console.warn("[voice] browser speech failed:", reason);
      done();
    };
    synth.speak(utterance);
  });
}

/** Reads the text aloud. Stops anything already playing. */
export async function play(text: string): Promise<void> {
  stop();
  const id = playId;

  if (voiceProvider() === "browser") {
    speakWithBrowser(text, id);
    return;
  }

  setState({ status: "loading", text });
  const url = await fetchAudioUrl(text);
  if (id !== playId) return;

  if (!url) {
    speakWithBrowser(text, id);
    return;
  }

  const element = new Audio(url);
  audio = element;
  const done = () => {
    if (id === playId) {
      audio = null;
      setState({ status: "idle", text: null });
    }
  };
  element.onended = done;
  try {
    setState({ status: "playing", text });
    await element.play();
  } catch {
    // The browser blocked or couldn't play the file. Use its own voice instead.
    if (id === playId) {
      audio = null;
      speakWithBrowser(text, id);
    }
  }
}

/** For tests. */
export function resetPlayer(): void {
  stop();
  audioUrls.clear();
}
