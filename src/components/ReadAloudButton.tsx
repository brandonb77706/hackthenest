"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/bridge/Icon";
import { iconButton } from "@/components/bridge/styles";
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
      className={`${iconButton} ${className}`}
      aria-label={mine ? "Stop reading" : label}
      aria-busy={mine && player.status === "loading"}
      disabled={!trimmed}
      onClick={() => (mine ? stop() : void play(trimmed))}
    >
      <Icon name={mine ? "stop" : "speaker"} size={20} strokeWidth={2.2} />
    </button>
  );
}
