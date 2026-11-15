"use client";

// The full-screen "Make a new routine" flow from the design:
//   pick a way → say it / type it → making → check your steps → when → ready
// Also edits a saved routine (starts at "check your steps").

import { ChallengeDone } from "@/features/rewards/components/ChallengeDone";
import type { ChallengeStatus } from "@/features/rewards/challenges";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { Buddy, useBuddyName } from "@/components/bridge/Buddy";
import { Icon, type IconName } from "@/components/bridge/Icon";
import { Switch } from "@/components/bridge/Switch";
import { br, iconButton } from "@/components/bridge/styles";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { ROUTINE_TONES, WEEKDAYS, type RoutineTone, type SupportLevel } from "@/lib/types";
import { useSpeechInput } from "@/lib/voice/useSpeechInput";
import { editorReducer, toEditorState, toRoutineInput } from "../editorState";
import { DAY_NAMES, formatDays, formatStepCount, formatTime } from "../format";
import { checkRoutine, LIMITS, type RoutineErrors, type RoutineInput } from "../routineInput";
import { MAX_GOAL_CHARS } from "../supportLevel";
import { BLANK_TEMPLATE_ID, startingRoutine, TEMPLATES } from "../templates";

type Stage = "pick" | "voice" | "type" | "making" | "review" | "when" | "done";

interface Props {
  /** Set to edit a saved routine. Leave out to make a new one. */
  routineId?: string;
  initial?: RoutineInput;
  /**
   * Set when a guardian makes or changes a routine for someone (the guardian view).
   * Leave out for the user's own routines.
   */
  forPerson?: {
    name: string;
    /** Where routines are saved, e.g. /api/guardian/people/<id>/routines */
    api: string;
    /** Where to go when done or closed, e.g. /guardian/<id>/routines */
    back: string;
  };
}

const STAGE_PART: Record<Stage, number> = { pick: 0, voice: 0, type: 0, making: 0, review: 1, when: 2, done: 3 };

const WAYS: { stage: Stage; icon: IconName; title: string; sub: string; tone: RoutineTone }[] = [
  { stage: "voice", icon: "mic", title: "Say it", sub: "Tell Bridge out loud. It makes the steps.", tone: "teal" },
  { stage: "type", icon: "pencil", title: "Type it", sub: "Write a sentence. Bridge makes the steps.", tone: "orange" },
  { stage: "review", icon: "list", title: "Build it myself", sub: "Add each step yourself.", tone: "sea" },
];

const EXAMPLES = ["Walk the dog after breakfast", "Do laundry on Sunday", "Take my medicine at night"];

const TIMES = [
  { label: "Morning", time: "08:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "21:00" },
];

const TONE_NAMES: Record<RoutineTone, string> = { teal: "Blue", sea: "Green", orange: "Orange", gold: "Yellow" };

/** "Smaller steps" means more support; "Bigger steps" means less. */
const SIZES: { label: string; level: SupportLevel }[] = [
  { label: "Smaller steps", level: "high" },
  { label: "Just right", level: "medium" },
  { label: "Bigger steps", level: "low" },
];

type DraftResult = { ok: true; routine: RoutineInput; supportLevel: SupportLevel } | { ok: false };

async function requestDraft(goal: string, supportLevel?: SupportLevel): Promise<DraftResult> {
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

/** The first problem to show, in plain words. */
function firstError(errors: RoutineErrors): string {
  const step = errors.step ? Object.values(errors.step)[0] : undefined;
  return errors.title ?? errors.steps ?? step?.text ?? step?.minutes ?? errors.days ?? errors.start_time ?? "";
}

export function Builder({ routineId, initial, forPerson }: Props) {
  const api = forPerson?.api ?? "/api/routines";
  const back = forPerson?.back ?? "/routines";
  const router = useRouter();
  const buddyName = useBuddyName();
  const editing = Boolean(routineId);
  const [stage, setStage] = useState<Stage>(editing ? "review" : "pick");
  const [state, dispatch] = useReducer(editorReducer, initial ?? startingRoutine(BLANK_TEMPLATE_ID)!, toEditorState);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  /** Set when the steps came from Bridge, so "Want different steps?" can redo them. */
  const [draftLevel, setDraftLevel] = useState<SupportLevel | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  /** Daily challenges that saving this routine finished */
  const [challengesDone, setChallengesDone] = useState<ChallengeStatus[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Next.js preserves hidden pages. Once creation is complete, start fresh
  // when the user leaves this page; preserve an unfinished draft instead.
  useLayoutEffect(() => {
    if (editing || stage !== "done") return;
    return () => {
      setStage("pick");
      dispatch({ type: "load", routine: startingRoutine(BLANK_TEMPLATE_ID)! });
      setText("");
      setError("");
      setDraftLevel(null);
      setSavedId(null);
      setChallengesDone([]);
    };
  }, [editing, stage]);

  const speech = useSpeechInput((said) => setText((t) => (t ? `${t} ${said}` : said).slice(0, MAX_GOAL_CHARS)));

  // Announce each new screen to screen readers.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  function go(next: Stage) {
    setError("");
    setStage(next);
  }

  const part = STAGE_PART[stage];
  const totalMinutes = state.steps.reduce((sum, s) => sum + (Number.isFinite(s.minutes) ? s.minutes : 0), 0);
  const allDays = state.days.length === 7;

  // ----- actions -----

  function pickWay(next: Stage) {
    if (next === "voice") {
      if (!speech.supported) {
        setStage("type");
        setError("Talking isn't available in this browser. You can type it.");
        return;
      }
      setText("");
      go("voice");
      speech.start();
    } else if (next === "review") {
      dispatch({ type: "load", routine: startingRoutine(BLANK_TEMPLATE_ID)! });
      setDraftLevel(null);
      go("review");
    } else {
      go(next);
    }
  }

  function startFromTemplate(id: string) {
    const routine = startingRoutine(id);
    if (!routine) return;
    dispatch({ type: "load", routine });
    setDraftLevel(null);
    go("review");
  }

  async function makeSteps() {
    const goal = text.trim();
    if (!goal) {
      setError("Type or say what you need to do first.");
      return;
    }
    speech.stop();
    const cameFrom = stage;
    go("making");
    const result = await requestDraft(goal);
    if (!result.ok) {
      setStage(cameFrom === "voice" ? "voice" : "type");
      setError("I couldn't make steps for that. Try saying it a different way, or build it yourself.");
      return;
    }
    dispatch({ type: "load", routine: result.routine });
    setDraftLevel(result.supportLevel);
    setStage("review");
  }

  async function resize(level: SupportLevel) {
    if (busy || level === draftLevel) return;
    setBusy(true);
    setError("");
    const result = await requestDraft(state.goal, level);
    setBusy(false);
    if (!result.ok) {
      setError("I couldn't make new steps. Your steps are still here.");
      return;
    }
    dispatch({ type: "replaceSteps", title: result.routine.title, steps: result.routine.steps });
    setDraftLevel(result.supportLevel);
  }

  /** The routine as it will be saved: empty steps are left out. */
  function cleaned(): RoutineInput {
    const input = toRoutineInput(state);
    return { ...input, steps: input.steps.filter((s) => s.text.trim()) };
  }

  function nextFromReview() {
    const result = checkRoutine(cleaned());
    const errors = result.ok ? {} : result.errors;
    if (errors.title || errors.steps || errors.step) {
      setError(firstError({ title: errors.title, steps: errors.steps, step: errors.step }));
      return;
    }
    go("when");
  }

  async function save() {
    const result = checkRoutine(cleaned());
    if (!result.ok) {
      setError(firstError(result.errors));
      return;
    }
    setBusy(true);
    setError("");
    try {
      // The time zone makes the new-routine challenge count the person's own day.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const url = routineId ? `${api}/${routineId}` : forPerson ? api : `${api}?tz=${encodeURIComponent(tz)}`;
      const response = await fetch(url, {
        method: routineId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { errors?: RoutineErrors };
        setError(
          response.status === 404
            ? "This routine was deleted."
            : (body.errors && firstError(body.errors)) || "Couldn't save. Check your internet and try again.",
        );
        return;
      }
      const body = (await response.json()) as { routine: { id: string }; challenges?: ChallengeStatus[] };
      setChallengesDone(body.challenges ?? []);
      // A guardian goes back to the person's routines; "Start it now" is for the person.
      if (editing || forPerson) {
        router.push(back);
        router.refresh();
        return;
      }
      setSavedId(body.routine.id);
      setStage("done");
    } catch {
      setError("Couldn't save. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!routineId) return;
    setBusy(true);
    const response = await fetch(`${api}/${routineId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (response && (response.ok || response.status === 404)) {
      router.push(back);
      router.refresh();
    } else {
      setError("Couldn't delete. Check your internet and try again.");
    }
  }

  // ----- bottom bar -----

  const bar =
    stage === "review"
      ? { primary: "Next", onPrimary: nextFromReview, secondary: editing ? "Cancel" : "Back", onSecondary: () => (editing ? router.push(back) : go("pick")) }
      : stage === "when"
        ? { primary: busy ? "Saving…" : "Save routine", onPrimary: save, secondary: "Back to steps", onSecondary: () => go("review") }
        : stage === "done"
          ? { primary: "Start it now", onPrimary: () => router.push(`/play/${savedId}`), secondary: "Back to my routines", onSecondary: () => router.push("/routines") }
          : null;

  return (
    <div className={`tone-${state.tone} flex min-h-dvh flex-col`}>
      {/* Header: close, progress, count */}
      <div className="sticky top-0 z-10 flex items-center gap-3.5 bg-canvas pb-2 pl-3.5 pr-[18px] pt-[22px]">
        <Link
          href={back}
          aria-label="Close without saving"
          className="flex size-12 shrink-0 items-center justify-center text-ink2"
        >
          <Icon name="close" size={28} strokeWidth={2.4} />
        </Link>
        <div
          role="progressbar"
          aria-label={`Making your routine, part ${Math.min(part + 1, 3)} of 3`}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={Math.min(part + 1, 3)}
          className="flex grow gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-3.5 flex-1 rounded-full ${stage === "done" || i < part ? "bg-switch-on" : i === part ? "bg-cta" : "bg-sunken"}`}
            />
          ))}
        </div>
        <span className="font-display text-[17px] font-bold text-ink2">{Math.min(part + 1, 3)}/3</span>
      </div>

      <div className={`flex grow flex-col gap-3.5 px-4 pt-2 ${bar ? "pb-[190px]" : "pb-7"}`}>
        {/* 1. How do you want to make it? */}
        {stage === "pick" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              {forPerson ? `Make a routine for ${forPerson.name}` : "Make a new routine"}
            </h1>
            <p className="-mt-1.5 mb-1 text-ink2">How do you want to make it?</p>
            {WAYS.map((w) => (
              <button
                key={w.stage}
                type="button"
                onClick={() => pickWay(w.stage)}
                className="br-press flex min-h-[92px] items-center gap-4 rounded-[20px] border-2 border-b-[5px] border-line bg-surface px-4 py-3.5 text-left text-ink"
              >
                <span
                  aria-hidden="true"
                  className={`tone-${w.tone} flex size-[58px] shrink-0 items-center justify-center rounded-2xl bg-tone text-tone-ink shadow-[0_4px_0_var(--t-edge)]`}
                >
                  <Icon name={w.icon} size={30} strokeWidth={2.2} />
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <strong className="font-display text-[19px] font-bold">{w.title}</strong>
                  <span className="text-[15px] leading-[1.3] text-ink2">{w.sub}</span>
                </span>
                <Icon name="forward" size={22} strokeWidth={2.4} className="shrink-0 text-ink2" />
              </button>
            ))}
            <h2 className={`${br.h2} mt-1.5`}>Quick start</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {!forPerson && (
                <Link href="/groceries" className={`${br.ghost} flex min-h-14 items-center justify-center rounded-2xl px-2.5 py-1.5 text-center text-[16px] leading-tight no-underline`}>
                  Grocery shopping
                </Link>
              )}
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startFromTemplate(t.id)}
                  className={`${br.ghost} min-h-14 rounded-2xl px-2.5 py-1.5 text-[16px] leading-tight`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 2a. Say it */}
        {stage === "voice" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              Tell Bridge
            </h1>
            <p className="-mt-1.5 text-ink2">
              Tap the microphone and say what you need to do, like &ldquo;walk the dog every morning&rdquo;.
            </p>
            <div className="flex flex-col items-center gap-3.5 pb-1.5 pt-[18px]">
              <span className="relative flex size-[150px] items-center justify-center">
                {speech.listening && <span aria-hidden="true" className="br-ring absolute inset-0 rounded-full bg-primary-soft" />}
                <button
                  type="button"
                  onClick={speech.listening ? speech.stop : speech.start}
                  aria-label={speech.listening ? "Stop listening" : "Start listening"}
                  aria-pressed={speech.listening}
                  className={`br-press relative flex size-[132px] items-center justify-center rounded-full border-0 p-0 ${
                    speech.listening
                      ? "bg-danger text-on-danger shadow-[0_7px_0_var(--br-danger-edge)]"
                      : "bg-cta text-cta-ink shadow-[0_7px_0_var(--br-cta-edge)]"
                  }`}
                >
                  <Icon name={speech.listening ? "stop" : "mic"} size={58} strokeWidth={2.2} />
                </button>
              </span>
              <span role="status" className="font-display text-[18px] font-semibold">
                {speech.listening ? "Listening…" : text ? "Got it. Tap Make my steps." : "Tap the microphone to talk"}
              </span>
              {speech.error && <p className="m-0 text-center font-bold text-danger-text">{speech.error}</p>}
            </div>
            <div className="flex min-h-24 flex-col gap-1.5 rounded-[18px] border-2 border-line bg-surface p-4">
              <span className="text-[15px] font-bold text-ink2">You said</span>
              <span className={`font-display text-[21px] font-medium leading-[1.3] ${text ? "text-ink" : "text-ink2"}`}>
                {text || "Your words show up here."}
              </span>
            </div>
            {error && (
              <p role="alert" className="m-0 font-bold text-danger-text">
                {error}
              </p>
            )}
            {text && !speech.listening && (
              <button type="button" onClick={makeSteps} className={`${br.cta} min-h-[60px] rounded-2xl text-[20px]`}>
                Make my steps
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                speech.stop();
                go("type");
              }}
              className={`${br.link} self-center`}
            >
              Type it instead
            </button>
            <button type="button" onClick={() => { speech.stop(); go("pick"); }} className={`${br.ghost} min-h-12 rounded-2xl px-4 text-[18px]`}>
              Back to choices
            </button>
          </>
        )}

        {/* 2b. Type it */}
        {stage === "type" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              Type it
            </h1>
            <p className="-mt-1.5 text-ink2">Write it in your own words. Bridge turns it into small, clear steps.</p>
            <label htmlFor="bd-text" className={`${br.label} -mb-2`}>
              What do you need to do?
            </label>
            <textarea
              id="bd-text"
              rows={4}
              maxLength={MAX_GOAL_CHARS}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
              }}
              placeholder="Example: get ready for work on weekdays"
              className={`${br.input} resize-none py-3.5 text-[20px]`}
            />
            <span className="text-[15px] font-bold text-ink2">Need an idea?</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setText(ex);
                    setError("");
                  }}
                  className="min-h-11 rounded-full border-2 border-line bg-surface px-3.5 text-[15px] text-ink"
                >
                  {ex}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="m-0 font-bold text-danger-text">
                {error}
              </p>
            )}
            <button type="button" onClick={makeSteps} className={`${br.cta} mt-1 min-h-[60px] rounded-2xl text-[20px]`}>
              Make my steps
            </button>
            <button type="button" onClick={() => pickWay("voice")} className={`${br.link} self-center`}>
              Say it instead
            </button>
            <button type="button" onClick={() => go("pick")} className={`${br.ghost} min-h-12 rounded-2xl px-4 text-[18px]`}>
              Back to choices
            </button>
          </>
        )}

        {/* 2c. Bridge is making the steps */}
        {stage === "making" && (
          <div role="status" className="flex flex-col items-center gap-4 pt-[90px] text-center">
            <span className="flex size-[140px] items-end justify-center overflow-hidden rounded-full border-4 border-cta bg-primary-soft">
              <Buddy size={128} />
            </span>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              Making your steps…
            </h1>
            <p className="m-0 max-w-[280px] text-ink2">
              {buddyName} is breaking &ldquo;{text}&rdquo; into small, clear steps.
            </p>
          </div>
        )}

        {/* 3. Check your steps */}
        {stage === "review" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              {editing ? "Edit your routine" : "Check your steps"}
            </h1>
            <label htmlFor="bd-name" className={`${br.label} -mb-2`}>
              Name
            </label>
            <input
              id="bd-name"
              value={state.title}
              maxLength={LIMITS.titleMax}
              onChange={(e) => {
                dispatch({ type: "setTitle", title: e.target.value });
                setError("");
              }}
              placeholder="Morning dog walk"
              className={br.input}
            />
            <div className="mt-1 flex items-baseline justify-between gap-2.5">
              <h2 className={br.h2}>Steps</h2>
              <span className="text-[15px] text-ink2">
                {formatStepCount(state.steps.length)} · about {totalMinutes} min
              </span>
            </div>
            <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
              {state.steps.map((step, i) => {
                const n = i + 1;
                const name = step.text.trim() || `step ${n}`;
                return (
                  <li
                    key={step.key}
                    className="flex flex-col gap-2.5 rounded-[20px] border-2 border-b-[5px] border-line bg-surface p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex size-[34px] items-center justify-center rounded-full bg-tone font-display text-[16px] font-bold text-tone-ink shadow-[0_3px_0_var(--t-edge)]"
                      >
                        {n}
                      </span>
                      <label htmlFor={`${step.key}-text`} className={br.label}>
                        Step {n}
                      </label>
                    </div>
                    <input
                      id={`${step.key}-text`}
                      value={step.text}
                      maxLength={LIMITS.stepTextMax}
                      onChange={(e) => {
                        dispatch({ type: "setStepText", index: i, text: e.target.value });
                        setError("");
                      }}
                      placeholder="What do you do?"
                      className={`${br.input} min-h-[50px] text-[17px]`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div role="group" aria-label={`Minutes for step ${n}`} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="One minute less"
                          className={iconButton}
                          onClick={() =>
                            dispatch({ type: "setStepMinutes", index: i, minutes: Math.max(LIMITS.minutesMin, (step.minutes || 1) - 1) })
                          }
                        >
                          <Icon name="minus" size={20} strokeWidth={2.6} />
                        </button>
                        <span className="min-w-[58px] text-center font-display text-[16px] font-semibold">{step.minutes} min</span>
                        <button
                          type="button"
                          aria-label="One minute more"
                          className={iconButton}
                          onClick={() =>
                            dispatch({ type: "setStepMinutes", index: i, minutes: Math.min(LIMITS.minutesMax, (step.minutes || 0) + 1) })
                          }
                        >
                          <Icon name="plus" size={20} strokeWidth={2.6} />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <ReadAloudButton text={step.text} label={`Read ${name} out loud`} />
                        <button
                          type="button"
                          aria-label={`Move ${name} up`}
                          disabled={i === 0}
                          className={`${iconButton} disabled:opacity-40`}
                          onClick={() => dispatch({ type: "moveStep", index: i, direction: "up" })}
                        >
                          <Icon name="up" size={20} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${name} down`}
                          disabled={i === state.steps.length - 1}
                          className={`${iconButton} disabled:opacity-40`}
                          onClick={() => dispatch({ type: "moveStep", index: i, direction: "down" })}
                        >
                          <Icon name="down" size={20} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${name}`}
                          disabled={state.steps.length === 1}
                          className={`${iconButton} text-danger-text disabled:opacity-40`}
                          onClick={() => dispatch({ type: "removeStep", index: i })}
                        >
                          <Icon name="close" size={20} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {state.steps.length < LIMITS.stepsMax && (
              <button
                type="button"
                onClick={() => dispatch({ type: "addStep" })}
                className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}
              >
                + Add a step
              </button>
            )}

            {draftLevel && (
              <div className="flex flex-col gap-2.5 rounded-[20px] bg-primary-soft p-4">
                <strong className="font-display text-[17px] font-semibold">Want different steps?</strong>
                <div role="radiogroup" aria-label="Step size" className="grid grid-cols-3 gap-2">
                  {SIZES.map((z) => {
                    const on = draftLevel === z.level;
                    return (
                      <button
                        key={z.level}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={busy}
                        onClick={() => resize(z.level)}
                        className={`min-h-[52px] rounded-[14px] p-1 font-display text-[15px] font-semibold leading-[1.15] text-ink ${
                          on ? "border-[3px] border-switch-on bg-surface" : "border-[3px] border-line bg-primary-soft"
                        }`}
                      >
                        {z.label}
                      </button>
                    );
                  })}
                </div>
                <p role="status" className="m-0 min-h-6 text-[16px]">
                  {busy ? "Making new steps…" : ""}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    setDraftLevel(null);
                    go("pick");
                  }}
                  className={`${br.ghost} min-h-[50px] rounded-[14px] text-[16px]`}
                >
                  Start over
                </button>
              </div>
            )}

            {editing &&
              (confirmDelete ? (
                <div role="group" aria-label="Delete this routine?" className="flex flex-col gap-3 rounded-[20px] border-[3px] border-danger bg-danger-soft p-[18px]">
                  <p className="m-0 font-display text-[20px] font-bold">Delete this routine? You can&apos;t undo this.</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={remove}
                    className="br-press h-14 rounded-2xl border-0 bg-danger font-display text-[19px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
                  >
                    Yes, delete it
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={`${br.ghost} h-14 rounded-2xl text-[19px]`}>
                    Keep it
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-12 self-center border-0 bg-transparent px-2 font-display text-[17px] font-semibold text-danger-text"
                >
                  Delete this routine
                </button>
              ))}
          </>
        )}

        {/* 4. When do you do this? */}
        {stage === "when" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              When do you do this?
            </h1>
            <h2 className={`${br.h2} mt-1.5`}>Days</h2>
            <div role="group" aria-label="Days" className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const on = state.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_NAMES[day].long}
                    onClick={() => {
                      dispatch({ type: "toggleDay", day });
                      setError("");
                    }}
                    className={`min-h-[52px] rounded-xl p-0 font-display text-[15px] font-semibold ${on ? br.choiceOn : br.choiceOff}`}
                  >
                    {DAY_NAMES[day].short}
                  </button>
                );
              })}
            </div>
            <Switch checked={allDays} onChange={(on) => dispatch({ type: "setEveryDay", on })}>
              Every day
            </Switch>

            <h2 className={`${br.h2} mt-1.5`}>Time</h2>
            <div role="radiogroup" aria-label="Time of day" className="grid grid-cols-3 gap-2">
              {TIMES.map((t) => {
                const on = state.start_time === t.time;
                return (
                  <button
                    key={t.time}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => dispatch({ type: "setTime", time: t.time })}
                    className={`flex min-h-[66px] flex-col items-center justify-center gap-0.5 rounded-[14px] p-1 ${on ? br.choiceOn : br.choiceOff}`}
                  >
                    <span className="font-display text-[15px] font-semibold">{t.label}</span>
                    <span className="text-[15px] text-ink2">{formatTime(t.time)}</span>
                  </button>
                );
              })}
            </div>
            <label htmlFor="bd-time" className={`${br.label} -mb-2`}>
              Or pick a time
            </label>
            <input
              id="bd-time"
              type="time"
              value={state.start_time}
              onChange={(e) => e.target.value && dispatch({ type: "setTime", time: e.target.value })}
              className={br.input}
            />

            <h2 className={`${br.h2} mt-1.5`}>Color</h2>
            <div role="radiogroup" aria-label="Color" className="flex gap-3">
              {ROUTINE_TONES.map((tone) => {
                const on = state.tone === tone;
                return (
                  <button
                    key={tone}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={TONE_NAMES[tone]}
                    onClick={() => dispatch({ type: "setTone", tone })}
                    className={`tone-${tone} size-[52px] rounded-full border-4 border-surface bg-tone p-0 ${
                      on ? "shadow-[0_0_0_3px_var(--br-switch-on)]" : "shadow-[0_0_0_2px_var(--br-line)]"
                    }`}
                  />
                );
              })}
            </div>

            <Switch checked={state.remind} onChange={(on) => dispatch({ type: "setRemind", on })} className="min-h-[62px]">
              <span>Remind me</span>
              <span className="text-[15px] text-ink2">When it&apos;s time to start</span>
            </Switch>
          </>
        )}

        {/* 5. Ready */}
        {stage === "done" && (
          <div className="flex flex-col items-center gap-4 pt-[60px] text-center">
            <span className="flex size-[140px] items-center justify-center rounded-full bg-go text-on-go shadow-[0_7px_0_var(--br-go-edge)]">
              <Icon name="check" size={68} strokeWidth={3} />
            </span>
            <h1 ref={headingRef} tabIndex={-1} className={br.h1}>
              {state.title.trim()} is ready
            </h1>
            <p className="m-0 text-[19px] text-ink2">
              {formatStepCount(cleaned().steps.length)} · {formatDays(state.days)} at {formatTime(state.start_time)}
            </p>
            <ChallengeDone challenges={challengesDone} />
          </div>
        )}
      </div>

      {bar && (
        <div className="fixed bottom-0 left-1/2 z-10 box-border flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-2.5 border-t-2 border-line bg-canvas px-4 pb-[22px] pt-3.5">
          {error && (
            <p role="alert" className="m-0 text-[16px] font-bold text-danger-text">
              {error}
            </p>
          )}
          <button type="button" disabled={busy} onClick={bar.onPrimary} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
            {bar.primary}
          </button>
          <button type="button" onClick={bar.onSecondary} className={`${br.ghost} min-h-[52px] rounded-2xl text-[17px]`}>
            {bar.secondary}
          </button>
        </div>
      )}
    </div>
  );
}
