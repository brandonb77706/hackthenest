"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SupportLevel } from "@/lib/types";
import { useSpeechInput } from "@/lib/voice/useSpeechInput";
import { biggerSteps, MAX_GOAL_CHARS, smallerSteps } from "../supportLevel";
import type { RoutineInput } from "../routineInput";
import { ui } from "../ui";
import { RoutineEditorPage } from "./RoutineEditorPage";

type DraftResponse = { ok: true; routine: RoutineInput; supportLevel: SupportLevel } | { ok: false };

async function requestDraft(goal: string, supportLevel?: SupportLevel): Promise<DraftResponse> {
  try {
    const response = await fetch("/api/routines/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, supportLevel }),
    });
    if (!response.ok) return { ok: false };
    const body = (await response.json()) as { routine: RoutineInput; supportLevel: SupportLevel };
    return { ok: true, ...body };
  } catch {
    return { ok: false };
  }
}

type Stage = "ask" | "loading" | "review" | "failed";

/** The AI path: say or type what you need, then review the steps Bridge drafts. */
export function TellBridge() {
  const [stage, setStage] = useState<Stage>("ask");
  const [goal, setGoal] = useState("");
  const [goalError, setGoalError] = useState("");
  const [draft, setDraft] = useState<{ routine: RoutineInput; supportLevel: SupportLevel; version: number } | null>(
    null,
  );
  const [redrafting, setRedrafting] = useState(false);
  const [redraftError, setRedraftError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const speech = useSpeechInput((text) => setGoal((current) => (current ? `${current} ${text}` : text).slice(0, MAX_GOAL_CHARS)));

  // Announce each new screen to screen readers.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  async function makeSteps() {
    const trimmed = goal.trim();
    if (!trimmed) {
      setGoalError("Tell me what you need first.");
      return;
    }
    setGoalError("");
    speech.stop();
    setStage("loading");
    const result = await requestDraft(trimmed);
    if (!result.ok) {
      setStage("failed");
      return;
    }
    setDraft({ routine: result.routine, supportLevel: result.supportLevel, version: 1 });
    setStage("review");
  }

  async function redraft(supportLevel: SupportLevel) {
    if (!draft) return;
    setRedrafting(true);
    setRedraftError("");
    const result = await requestDraft(draft.routine.goal, supportLevel);
    setRedrafting(false);
    if (!result.ok) {
      setRedraftError("I couldn't make new steps. Your steps are still here.");
      return;
    }
    setDraft({ routine: result.routine, supportLevel: result.supportLevel, version: draft.version + 1 });
  }

  if (stage === "review" && draft) {
    const redraftControls = (
      <div className={`${ui.card} mt-4 space-y-3`}>
        <p className="font-semibold">Want different steps?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={ui.secondary}
            disabled={redrafting || draft.supportLevel === "high"}
            onClick={() => redraft(smallerSteps(draft.supportLevel))}
          >
            Smaller steps
          </button>
          <button
            type="button"
            className={ui.secondary}
            disabled={redrafting || draft.supportLevel === "low"}
            onClick={() => redraft(biggerSteps(draft.supportLevel))}
          >
            Bigger steps
          </button>
        </div>
        <p role="status" className="min-h-7">
          {redrafting ? "Making new steps…" : ""}
        </p>
        {redraftError && <p className={ui.error}>{redraftError}</p>}
        <button type="button" className={`${ui.secondary} w-full`} onClick={() => setStage("ask")}>
          Start over
        </button>
      </div>
    );

    return (
      <RoutineEditorPage
        key={draft.version}
        initial={draft.routine}
        heading="Check your steps"
        stepsExtra={redraftControls}
      />
    );
  }

  if (stage === "loading") {
    return (
      <main className={ui.page}>
        <h1 ref={headingRef} tabIndex={-1} role="status" className={ui.h1}>
          Making your steps…
        </h1>
      </main>
    );
  }

  if (stage === "failed") {
    return (
      <main className={`${ui.page} space-y-6`}>
        <h1 ref={headingRef} tabIndex={-1} className={ui.h1}>
          I couldn&apos;t make steps for that.
        </h1>
        <p>Try saying it a different way, or pick another way to start.</p>
        <button type="button" className={ui.primary} onClick={() => setStage("ask")}>
          Try again
        </button>
        <Link href="/routines/new" className={`${ui.secondary} w-full`}>
          Use a quick start
        </Link>
        <Link href="/routines/new/blank" className={`${ui.secondary} w-full`}>
          Make it myself
        </Link>
      </main>
    );
  }

  return (
    <main className={`${ui.page} space-y-6`}>
      <h1 ref={headingRef} tabIndex={-1} className={ui.h1}>
        Tell me what you need.
      </h1>

      <div>
        <label htmlFor="goal" className={ui.label}>
          What do you need to do?
        </label>
        <p id="goal-hint" className="mt-1 text-zinc-700 dark:text-zinc-300">
          For example: &ldquo;Take my medicine every morning after breakfast.&rdquo;
        </p>
        <textarea
          id="goal"
          rows={3}
          maxLength={MAX_GOAL_CHARS}
          className={`${ui.input} py-2`}
          value={goal}
          aria-describedby={goalError ? "goal-hint goal-error" : "goal-hint"}
          aria-invalid={Boolean(goalError)}
          onChange={(e) => setGoal(e.target.value)}
        />
        {goalError && (
          <p id="goal-error" className={ui.error}>
            {goalError}
          </p>
        )}
      </div>

      {speech.supported && (
        <div>
          <button
            type="button"
            className={`${ui.secondary} w-full`}
            aria-pressed={speech.listening}
            onClick={speech.listening ? speech.stop : speech.start}
          >
            {speech.listening ? "■ Stop listening" : "🎤 Talk instead"}
          </button>
          <p role="status" className="mt-2 min-h-7">
            {speech.listening ? "Listening… say what you need." : ""}
          </p>
          {speech.error && <p className={ui.error}>{speech.error}</p>}
        </div>
      )}

      <button type="button" className={ui.primary} onClick={makeSteps}>
        Make my steps
      </button>

      <Link href="/routines/new/blank" className={`${ui.secondary} w-full`}>
        Make it myself instead
      </Link>
    </main>
  );
}
