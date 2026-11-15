"use client";

// Speak for me: type it, or tap a saved message. The phone says it out loud.

import { useEffect, useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import type { SpeakPhrase } from "@/lib/types";
import { play, stop } from "@/lib/voice/player";
import { MAX_PHRASE_CHARS } from "../phrases";

interface Props {
  phrases: SpeakPhrase[];
  onPhrasesChange: (phrases: SpeakPhrase[]) => void;
}

export function SpeakForMe({ phrases, onPhrasesChange }: Props) {
  const [typed, setTyped] = useState("");
  const [said, setSaid] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => stop(), []);

  function say(text: string) {
    setSaid(text);
    void play(text);
  }

  async function save() {
    const text = typed.replace(/\s+/g, " ").trim();
    if (!text) return;
    if (phrases.some((p) => p.text === text)) {
      setError("That message is already saved.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const { phrase } = (await response.json()) as { phrase: SpeakPhrase };
      onPhrasesChange([...phrases, phrase]);
    } catch {
      setError("Couldn't save that message. Check your internet.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(phrase: SpeakPhrase) {
    onPhrasesChange(phrases.filter((p) => p.id !== phrase.id));
    const response = await fetch(`/api/phrases/${phrase.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!response || (!response.ok && response.status !== 404)) {
      onPhrasesChange(phrases);
      setError("Couldn't remove that message. Check your internet.");
    }
  }

  const bigText = typed.trim() || said || "Please write it down for me.";

  if (big) {
    return (
      <div
        role="dialog"
        aria-label="Message shown big"
        className="fixed inset-0 z-40 mx-auto flex w-full max-w-[480px] flex-col justify-between gap-5 bg-surface px-6 pb-8 pt-10"
      >
        <p className="m-0 text-balance font-display text-[44px] font-bold leading-[1.15]">
          {bigText}
        </p>
        <button
          type="button"
          onClick={() => setBig(false)}
          className={`${br.cta} h-[60px] rounded-2xl text-[21px]`}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 -mt-1 text-ink2">
        Type it, or tap a saved message. Your phone says it out loud.
      </p>
      <label htmlFor="say-text" className={br.label}>
        What do you want to say?
      </label>
      <textarea
        id="say-text"
        rows={3}
        maxLength={MAX_PHRASE_CHARS}
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          setError("");
        }}
        placeholder="Type here"
        className={`${br.input} resize-none py-3.5 text-[20px]`}
      />
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={!typed.trim()}
          onClick={() => say(typed.trim())}
          className={`${br.cta} flex h-[58px] flex-[2] items-center justify-center gap-2 rounded-2xl text-[20px]`}
        >
          <Icon name="speakerLoud" size={24} strokeWidth={2.2} />
          Read it out loud
        </button>
        <button
          type="button"
          onClick={() => setBig(true)}
          className={`${br.ghost} h-[58px] flex-1 rounded-2xl text-[17px]`}
        >
          Show big
        </button>
      </div>
      <button
        type="button"
        disabled={!typed.trim() || saving}
        onClick={save}
        className={`${br.link} self-start px-0`}
      >
        + Save as a message
      </button>
      {error && (
        <p role="alert" className="m-0 font-bold text-danger-text">
          {error}
        </p>
      )}

      <h2 className="m-0 mt-1.5 font-display text-[22px] font-bold">
        Saved messages
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {phrases.map((phrase) => {
          const on = said === phrase.text;
          return (
            <li key={phrase.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => say(phrase.text)}
                className={`flex min-h-[60px] grow items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] text-ink ${
                  on
                    ? "border-switch-on bg-primary-soft"
                    : "border-line bg-surface"
                }`}
              >
                <Icon name="speaker" size={22} className="shrink-0" />
                <span>{phrase.text}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove message: ${phrase.text}`}
                onClick={() => remove(phrase)}
                className="flex w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-line bg-surface text-ink2"
              >
                <Icon name="close" size={18} strokeWidth={2.4} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
