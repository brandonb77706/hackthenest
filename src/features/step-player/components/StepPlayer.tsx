"use client";

// The step player from the design: one step per screen, read out loud, with
// Done and Back, then a results screen. For a saved routine, tapping Done saves
// that the step was finished, so Today shows real progress. A walkthrough (like
// "Walk me through it" on Scan) only steps through a list and saves nothing.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { formatStepCount } from "@/features/routine-builder/format";
import type { RoutineWithSteps } from "@/features/routine-builder/service";
import { play, stop } from "@/lib/voice/player";
import { stepIcon } from "../stepIcon";

export interface Walkthrough {
  title: string;
  steps: string[];
}

interface Props {
  /** A saved routine to load. Leave out when passing a walkthrough. */
  routineId?: string;
  /** Steps to go through without saving anything */
  walkthrough?: Walkthrough;
  /** For a walkthrough: called by the close and Continue buttons */
  onExit?: () => void;
  /** 1-based step to open on, e.g. from "Keep going" */
  startStep?: number;
}

function walkthroughRoutine(w: Walkthrough): RoutineWithSteps {
  return {
    id: "walkthrough",
    user_id: "",
    title: w.title,
    goal: "",
    days: [],
    start_time: "00:00",
    active: true,
    tone: "orange",
    remind: false,
    steps: w.steps.map((text, i) => ({
      id: `w${i}`,
      user_id: "",
      routine_id: "walkthrough",
      order: i + 1,
      text,
      minutes: 1,
      image_url: null,
      audio_url: null,
    })),
  };
}

type Load = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; routine: RoutineWithSteps };

export function StepPlayer({ routineId, walkthrough, onExit, startStep = 1 }: Props) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>(() =>
    walkthrough && walkthrough.steps.length > 0 ? { status: "ready", routine: walkthroughRoutine(walkthrough) } : { status: "loading" },
  );
  const saves = !walkthrough;
  const [index, setIndex] = useState(0);
  const [finishedMinutes, setFinishedMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  const gotHelp = useRef(new Set<string>());

  useEffect(() => {
    if (walkthrough) {
      startedAt.current = Date.now();
      return () => stop();
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/routines/${routineId}`, { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 404) return setLoad({ status: "missing" });
        if (!response.ok) throw new Error(String(response.status));
        const { routine } = (await response.json()) as { routine: RoutineWithSteps };
        if (cancelled) return;
        if (routine.steps.length === 0) return setLoad({ status: "missing" });
        startedAt.current = Date.now();
        setIndex(Math.min(Math.max(startStep - 1, 0), routine.steps.length - 1));
        setLoad({ status: "ready", routine });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
    // The walkthrough is read once when the player opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, startStep]);

  const routine = load.status === "ready" ? load.routine : null;
  const step = routine?.steps[index] ?? null;
  const showResults = finishedMinutes !== null;

  // Read each step out loud when it appears.
  const stepText = step?.text ?? "";
  useEffect(() => {
    if (stepText && !showResults) void play(stepText);
  }, [stepText, showResults]);

  if (!routine || !step) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 role={load.status === "loading" ? "status" : undefined} className={br.h1}>
          {load.status === "loading"
            ? "Getting your steps…"
            : load.status === "missing"
              ? "I can't find that routine."
              : "Couldn't load this routine."}
        </h1>
        {load.status === "error" && <p className="m-0 text-ink2">Check your internet and try again.</p>}
        {load.status !== "loading" && (
          <Link href="/" className={`${br.cta} flex h-[58px] w-full items-center justify-center rounded-2xl text-[20px] no-underline`}>
            Back to Today
          </Link>
        )}
      </div>
    );
  }

  const total = routine.steps.length;
  const position = showResults ? total : index + 1;

  async function done() {
    if (!routine || !step || saving) return;
    setError("");
    if (saves) {
      setSaving(true);
      try {
        const response = await fetch(`/api/routines/${routine.id}/steps/${step.id}/done`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ used_help: gotHelp.current.has(step.id) }),
        });
        if (!response.ok) throw new Error(String(response.status));
      } catch {
        setSaving(false);
        setError("Couldn't save that step. Check your internet and tap Done again.");
        return;
      }
      setSaving(false);
    }
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    setFinishedMinutes(minutes);
    void play(`${routine.title} done. Nice work.`);
  }

  function needHelp() {
    if (step) gotHelp.current.add(step.id);
    stop();
    router.push("/get-help");
  }

  return (
    <div className={`tone-${routine.tone} flex min-h-dvh flex-col bg-canvas`}>
      <div className="flex items-center gap-3.5 pl-3.5 pr-[18px] pt-[22px]">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            aria-label="Leave"
            className="flex size-12 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-ink2"
          >
            <Icon name="close" size={28} strokeWidth={2.4} />
          </button>
        ) : (
          <Link href="/" aria-label="Leave routine" className="flex size-12 shrink-0 items-center justify-center text-ink2">
            <Icon name="close" size={28} strokeWidth={2.4} />
          </Link>
        )}
        <div
          role="progressbar"
          aria-label="Steps done"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={position}
          className="h-4 grow overflow-hidden rounded-full bg-sunken"
        >
          <div className="h-full rounded-full bg-go" style={{ width: `${Math.round((position / total) * 100)}%` }} />
        </div>
        <span className="font-display text-[18px] font-bold text-ink2">
          {position}/{total}
        </span>
      </div>

      {showResults ? (
        <>
          <div className="flex grow flex-col items-center justify-center gap-[22px] px-6 text-center">
            <div className="flex size-[136px] items-center justify-center rounded-full bg-go text-ink shadow-[0_6px_0_var(--br-go-edge)]">
              <Icon name="check" size={68} strokeWidth={3} />
            </div>
            <h1 className="m-0 font-display text-[32px] font-bold leading-[1.15]">{routine.title} done</h1>
            <div className="grid w-full grid-cols-2 gap-2.5">
              <div className={`${br.card} flex flex-col gap-0.5 rounded-2xl px-1.5 py-3.5`}>
                <span className="font-display text-[26px] font-bold">{total}</span>
                <span className="text-[15px] text-ink2">{total === 1 ? "step" : "steps"}</span>
              </div>
              <div className={`${br.card} flex flex-col gap-0.5 rounded-2xl px-1.5 py-3.5`}>
                <span className="font-display text-[26px] font-bold">{finishedMinutes}</span>
                <span className="text-[15px] text-ink2">{finishedMinutes === 1 ? "minute" : "minutes"}</span>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-line px-4 pb-7 pt-[18px]">
            {onExit ? (
              <button type="button" onClick={onExit} className={`${br.cta} h-[60px] w-full rounded-2xl text-[22px]`}>
                Continue
              </button>
            ) : (
              <Link href="/" className={`${br.cta} flex h-[60px] w-full items-center justify-center rounded-2xl text-[22px] no-underline`}>
                Continue
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex grow flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="mb-2 flex size-[136px] items-center justify-center rounded-full bg-tone text-ink shadow-[0_6px_0_var(--t-edge)]">
              <Icon name={stepIcon(step.text)} size={60} />
            </div>
            <p className="m-0 font-display text-[17px] font-semibold text-ink2">
              {routine.title} · Step {index + 1} of {formatStepCount(total)}
            </p>
            <h1 className="m-0 text-balance font-display text-[34px] font-bold leading-[1.12]">{step.text}</h1>
            <button
              type="button"
              onClick={() => void play(step.text)}
              className="flex min-h-[52px] items-center gap-2.5 rounded-full border-0 bg-sunken px-[22px] font-display text-[19px] font-semibold text-ink"
            >
              <Icon name="speakerLoud" size={24} />
              Say it again
            </button>
          </div>
          <div className="flex flex-col gap-3.5 border-t-2 border-line px-4 py-[18px]">
            {error && (
              <p role="alert" className="m-0 font-bold text-danger-text">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Back one step"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
                className={`${br.ghost} flex h-[60px] w-16 items-center justify-center rounded-2xl p-0 disabled:opacity-45`}
              >
                <Icon name="back" size={26} strokeWidth={2.2} />
              </button>
              <button type="button" disabled={saving} onClick={done} className={`${br.cta} h-[60px] grow rounded-2xl text-[22px]`}>
                Done
              </button>
            </div>
            <button
              type="button"
              onClick={needHelp}
              className="flex min-h-11 items-center justify-center gap-2 border-0 bg-transparent font-display text-[18px] font-semibold text-danger-text"
            >
              <Icon name="help" size={22} />
              I need help with this step
            </button>
          </div>
        </>
      )}
    </div>
  );
}
