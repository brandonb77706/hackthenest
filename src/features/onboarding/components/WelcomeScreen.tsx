"use client";

// Welcome: two short screens after the first sign-in. Name, then Buddy.
// One question per screen, with Back on the second.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BuddyAvatar } from "@/components/bridge/BuddyAvatar";
import { CoinIcon, Icon } from "@/components/bridge/Icon";
import { br, iconButton } from "@/components/bridge/styles";
import { buddyTag } from "@/features/me/summary";
import { updateSettings } from "@/lib/settings";
import type { WelcomeData } from "../service";
import { cleanName, NAME_MAX } from "../welcome";

const STEPS = 2;

export function WelcomeScreen({ data }: { data: WelcomeData }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.name);
  const choosable = data.buddies.filter((b) => b.can_choose);
  const [buddyId, setBuddyId] = useState(
    choosable.find((b) => b.equipped)?.id ?? choosable.find((b) => b.name === "Fox")?.id ?? choosable[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Screen readers hear the new question when the step changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const buddy = data.buddies.find((b) => b.id === buddyId);
  const cleaned = cleanName(name);

  function next(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    void finish();
  }

  async function finish() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/welcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: cleaned, avatar_id: buddyId }),
      });
      const body = (await res.json().catch(() => ({}))) as { buddy_name?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "Couldn't save. Try again.");
      updateSettings({ buddyName: body.buddy_name ?? buddy?.name ?? "Fox", showBuddy: true });
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't save. Check your internet.");
      setBusy(false);
    }
  }

  const canGo = step === 0 ? Boolean(cleaned) : Boolean(buddyId);
  const cta = step < STEPS - 1 ? "Next" : busy ? "Saving…" : "Start using Bridge";

  return (
    <div className="br-root mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas text-ink">
      <header className="flex items-center gap-3 rounded-b-[32px] bg-hero px-4 pb-5 pt-5 text-hero-ink shadow-[inset_0_-5px_0_var(--br-hero-edge)]">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} aria-label="Back" className={iconButton}>
            <Icon name="back" size={22} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
        <div className="flex grow flex-col gap-1.5">
          <span className="text-[16px] font-bold">
            Step {step + 1} of {STEPS}
          </span>
          <span aria-hidden="true" className="flex gap-1.5">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={`h-2 grow rounded-full ${i <= step ? "bg-surface" : "bg-white/40"}`} />
            ))}
          </span>
        </div>
        <BuddyAvatar name={buddy?.name ?? "Fox"} size={64} />
      </header>

      <form onSubmit={next} className="flex grow flex-col gap-3.5 px-5 pb-6 pt-6">
        {step === 0 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={br.h1}>
              What should we call you?
            </h1>
            <p className="m-0 -mt-1.5 text-[18px] text-ink2">This is how Bridge will say hi to you.</p>
            <label htmlFor="welcome-name" className={`${br.label} mt-1 -mb-2`}>
              Your name
            </label>
            <input
              id="welcome-name"
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={br.input}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={br.h1}>
              Pick your Buddy
            </h1>
            <p className="m-0 -mt-1.5 text-[18px] text-ink2">
              Your Buddy gives tips on every screen. Finish routines to unlock more. You can change it later on Me.
            </p>
            <div role="radiogroup" aria-label="Buddy" className="grid grid-cols-2 gap-3">
              {data.buddies.map((b) => {
                const on = b.id === buddyId;
                const locked = !b.can_choose;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={locked}
                    aria-label={locked ? `${b.name}, locked, ${buddyTag(b)}` : b.name}
                    onClick={() => {
                      if (!locked) setBuddyId(b.id);
                    }}
                    className={`br-press flex flex-col items-center gap-1.5 rounded-[22px] border-[3px] px-2.5 pb-3.5 pt-4 text-ink ${
                      on
                        ? "border-switch-on bg-primary-soft shadow-[0_4px_0_var(--br-switch-on)]"
                        : "border-line bg-surface shadow-[0_4px_0_var(--br-line)]"
                    }`}
                  >
                    <span
                      className={`flex size-[104px] items-end justify-center overflow-hidden rounded-full bg-primary-soft ${locked ? "opacity-40" : ""}`}
                    >
                      <BuddyAvatar name={b.name} size={96} />
                    </span>
                    <span className="font-display text-[18px] font-bold">{b.name}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[15px] font-bold text-ink ${
                        on ? "bg-switch-on text-knob" : locked ? "bg-sunken" : "bg-go-soft"
                      }`}
                    >
                      {locked && b.unlock_type === "shop" && <CoinIcon size={16} />}
                      {on ? "Picked" : locked ? buddyTag(b) : "Free"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 mt-auto bg-canvas pb-1 pt-3">
          <button
            type="submit"
            disabled={!canGo || busy}
            className={`${br.cta} min-h-[60px] w-full rounded-2xl text-[21px]`}
          >
            {cta}
          </button>
        </div>
      </form>
    </div>
  );
}
