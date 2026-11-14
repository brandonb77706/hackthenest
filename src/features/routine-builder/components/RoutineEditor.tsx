"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { WEEKDAYS } from "@/lib/types";
import { editorReducer, toEditorState, toRoutineInput } from "../editorState";
import { DAY_NAMES } from "../format";
import { checkRoutine, hasStepErrors, LIMITS, type RoutineErrors, type RoutineInput } from "../routineInput";
import { ui } from "../ui";

export type SaveResult = { ok: true } | { ok: false; errors?: RoutineErrors; message?: string };

interface Props {
  initial: RoutineInput;
  /** Shown at the top of the steps screen, e.g. "New routine" */
  heading: string;
  onSave: (routine: RoutineInput) => Promise<SaveResult>;
  /** Only when editing a saved routine */
  onDelete?: () => Promise<void>;
}

type Screen = "steps" | "schedule";

export function RoutineEditor({ initial, heading, onSave, onDelete }: Props) {
  const [state, dispatch] = useReducer(editorReducer, initial, toEditorState);
  const [screen, setScreen] = useState<Screen>("steps");
  const [errors, setErrors] = useState<RoutineErrors>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new screen's heading so screen readers announce it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [screen]);

  function goToSchedule() {
    const result = checkRoutine(toRoutineInput(state));
    const stepErrors = result.ok ? {} : result.errors;
    if (hasStepErrors(stepErrors)) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setScreen("schedule");
  }

  async function save() {
    setMessage("");
    const result = checkRoutine(toRoutineInput(state));
    if (!result.ok) {
      setErrors(result.errors);
      if (hasStepErrors(result.errors)) setScreen("steps");
      return;
    }
    setSaving(true);
    const saved = await onSave(result.value).catch(() => ({ ok: false, message: undefined }) as SaveResult);
    setSaving(false);
    if (!saved.ok) {
      if (saved.errors) {
        setErrors(saved.errors);
        if (hasStepErrors(saved.errors)) setScreen("steps");
      }
      setMessage(saved.message ?? "Couldn't save. Check your internet and try again.");
    }
  }

  return (
    <div className={ui.page}>
      {screen === "steps" ? (
        <section aria-labelledby="editor-heading" className="space-y-6">
          <h1 id="editor-heading" ref={headingRef} tabIndex={-1} className={ui.h1}>
            {heading}
          </h1>

          <div>
            <label htmlFor="routine-title" className={ui.label}>
              Name
            </label>
            <input
              id="routine-title"
              className={ui.input}
              value={state.title}
              maxLength={LIMITS.titleMax}
              placeholder="Take medicine"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "routine-title-error" : undefined}
              onChange={(e) => dispatch({ type: "setTitle", title: e.target.value })}
            />
            {errors.title && (
              <p id="routine-title-error" className={ui.error}>
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <h2 className={ui.h2}>Steps</h2>
            {errors.steps && <p className={ui.error}>{errors.steps}</p>}
            <ol className="mt-3 space-y-4">
              {state.steps.map((step, i) => {
                const n = i + 1;
                const stepError = errors.step?.[i];
                return (
                  <li key={step.key} className={ui.card}>
                    <label htmlFor={`${step.key}-text`} className={ui.label}>
                      Step {n}
                    </label>
                    <input
                      id={`${step.key}-text`}
                      className={ui.input}
                      value={step.text}
                      maxLength={LIMITS.stepTextMax}
                      aria-invalid={Boolean(stepError?.text)}
                      onChange={(e) => dispatch({ type: "setStepText", index: i, text: e.target.value })}
                    />
                    {stepError?.text && <p className={ui.error}>{stepError.text}</p>}

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="w-28">
                        <label htmlFor={`${step.key}-minutes`} className={ui.label}>
                          Minutes
                        </label>
                        <input
                          id={`${step.key}-minutes`}
                          type="number"
                          inputMode="numeric"
                          min={LIMITS.minutesMin}
                          max={LIMITS.minutesMax}
                          className={ui.input}
                          value={Number.isNaN(step.minutes) ? "" : step.minutes}
                          aria-invalid={Boolean(stepError?.minutes)}
                          onChange={(e) =>
                            dispatch({ type: "setStepMinutes", index: i, minutes: e.target.valueAsNumber })
                          }
                        />
                      </div>
                      <div className="ml-auto flex gap-2">
                        <ReadAloudButton text={step.text} label={`Read step ${n} aloud`} />
                        <button
                          type="button"
                          className={ui.icon}
                          aria-label={`Move step ${n} up`}
                          disabled={i === 0}
                          onClick={() => dispatch({ type: "moveStep", index: i, direction: "up" })}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={ui.icon}
                          aria-label={`Move step ${n} down`}
                          disabled={i === state.steps.length - 1}
                          onClick={() => dispatch({ type: "moveStep", index: i, direction: "down" })}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={ui.icon}
                          aria-label={`Remove step ${n}`}
                          disabled={state.steps.length === 1}
                          onClick={() => dispatch({ type: "removeStep", index: i })}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {stepError?.minutes && <p className={ui.error}>{stepError.minutes}</p>}
                  </li>
                );
              })}
            </ol>

            {state.steps.length < LIMITS.stepsMax && (
              <button type="button" className={`${ui.secondary} mt-4 w-full`} onClick={() => dispatch({ type: "addStep" })}>
                + Add a step
              </button>
            )}
          </div>

          {message && (
            <p role="alert" className={ui.error}>
              {message}
            </p>
          )}

          <button type="button" className={ui.primary} onClick={goToSchedule}>
            Next
          </button>

          {onDelete && <DeleteRoutine onDelete={onDelete} />}
        </section>
      ) : (
        <section aria-labelledby="schedule-heading" className="space-y-6">
          <h1 id="schedule-heading" ref={headingRef} tabIndex={-1} className={ui.h1}>
            When do you do this?
          </h1>

          <fieldset>
            <legend className={ui.label}>Days</legend>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const on = state.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_NAMES[day].long}
                    className={
                      on
                        ? `${ui.icon} border-blue-700 bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-700`
                        : ui.icon
                    }
                    onClick={() => dispatch({ type: "toggleDay", day })}
                  >
                    {DAY_NAMES[day].short}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 flex min-h-12 items-center gap-3 text-lg">
              <input
                type="checkbox"
                className="size-6"
                checked={state.days.length === 7}
                onChange={(e) => dispatch({ type: "setEveryDay", on: e.target.checked })}
              />
              Every day
            </label>
            {errors.days && <p className={ui.error}>{errors.days}</p>}
          </fieldset>

          <div>
            <label htmlFor="routine-time" className={ui.label}>
              Time
            </label>
            <input
              id="routine-time"
              type="time"
              className={ui.input}
              value={state.start_time}
              aria-invalid={Boolean(errors.start_time)}
              onChange={(e) => dispatch({ type: "setTime", time: e.target.value })}
            />
            {errors.start_time && <p className={ui.error}>{errors.start_time}</p>}
          </div>

          {message && (
            <p role="alert" className={ui.error}>
              {message}
            </p>
          )}

          <div className="space-y-3">
            <button type="button" className={ui.primary} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className={`${ui.secondary} w-full`} onClick={() => setScreen("steps")}>
              Back to steps
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function DeleteRoutine({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className={`${ui.danger} w-full`} onClick={() => setConfirming(true)}>
        Delete this routine
      </button>
    );
  }

  return (
    <div role="group" aria-label="Delete this routine?" className={`${ui.card} space-y-3`}>
      <p className="font-semibold">Delete this routine? You can&apos;t undo this.</p>
      <button
        type="button"
        className={`${ui.danger} w-full`}
        disabled={deleting}
        onClick={async () => {
          setDeleting(true);
          await onDelete().finally(() => setDeleting(false));
        }}
      >
        {deleting ? "Deleting…" : "Yes, delete it"}
      </button>
      <button type="button" className={`${ui.secondary} w-full`} onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </div>
  );
}
