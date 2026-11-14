"use client";

import { useSyncExternalStore } from "react";
import { getPlayerState, play, stop, subscribe } from "@/lib/voice/player";

interface Props {
  /** What to read */
  text: string;
  /** What a screen reader says for the button, e.g. "Read step 2 aloud" */
  label?: string;
  className?: string;
}

const idle = { status: "idle", text: null } as const;

/**
 * Reads text aloud with the user's ElevenLabs voice, or the browser's voice if
 * ElevenLabs isn't available. Tap again to stop. Shared: the routine builder
 * and the step player both use it.
 */
export function ReadAloudButton({ text, label = "Read aloud", className = "" }: Props) {
  const player = useSyncExternalStore(subscribe, getPlayerState, () => idle);
  const trimmed = text.trim();
  const mine = player.text === trimmed && player.status !== "idle";

  return (
    <button
      type="button"
      className={
        "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-zinc-400 bg-white px-3 " +
        "text-lg font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-4 " +
        "focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 " +
        "dark:bg-zinc-900 dark:text-zinc-50 " +
        className
      }
      aria-label={mine ? "Stop reading" : label}
      aria-busy={mine && player.status === "loading"}
      disabled={!trimmed}
      onClick={() => (mine ? stop() : void play(trimmed))}
    >
      <span aria-hidden="true">{mine ? (player.status === "loading" ? "…" : "■") : "🔊"}</span>
    </button>
  );
}
