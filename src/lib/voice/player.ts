// Plays text aloud in the browser. Only one thing plays at a time.
// Tries ElevenLabs (through /api/speak) first, then the browser's own voice.

export type PlayerStatus = "idle" | "loading" | "playing";

export interface PlayerState {
  status: PlayerStatus;
  /** What's loading or playing */
  text: string | null;
}

const FALLBACK_RATE = 0.9;

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

export function stop(): void {
  playId++;
  audio?.pause();
  audio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = FALLBACK_RATE;
  const done = () => {
    if (id === playId) setState({ status: "idle", text: null });
  };
  utterance.onend = done;
  utterance.onerror = done;
  setState({ status: "playing", text });
  window.speechSynthesis.speak(utterance);
}

/** Reads the text aloud. Stops anything already playing. */
export async function play(text: string): Promise<void> {
  stop();
  const id = playId;
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
