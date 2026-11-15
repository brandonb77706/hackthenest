"use client";

// Lets people talk instead of type, using the browser's built-in speech
// recognition. Works in Chrome, Edge, and Safari. Where it isn't supported,
// `supported` is false and the mic button should be hidden.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Bridge needs permission to use the microphone. You can type instead.",
  "service-not-allowed": "Bridge needs permission to use the microphone. You can type instead.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "I can't find a microphone. You can type instead.",
  network: "Talking needs the internet. You can type instead.",
};

/** Calls onText with what the person said each time they finish talking. */
export function useSpeechInput(onText: (text: string) => void) {
  // false on the server and on first render, so the page matches the server HTML.
  const supported = useSyncExternalStore(noSubscribe, () => recognitionClass() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    const Recognition = recognitionClass();
    if (!Recognition) return;
    setError("");
    const r = new Recognition();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onTextRef.current(text);
    };
    r.onerror = (event) => {
      if (event.error !== "aborted") setError(ERROR_MESSAGES[event.error] ?? "Something went wrong with the mic. You can type instead.");
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
