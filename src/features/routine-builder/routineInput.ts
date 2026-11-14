// What the routine editor sends to the server, and the one check both sides run.
// The browser runs it to show messages; the server runs it again before saving.

import { WEEKDAYS, type ID, type Weekday } from "@/lib/types";

export const LIMITS = {
  titleMax: 60,
  stepsMin: 1,
  stepsMax: 15,
  stepTextMax: 80,
  minutesMin: 1,
  minutesMax: 120,
} as const;

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface StepInput {
  /** Set when editing a step that's already saved */
  id?: ID;
  text: string;
  minutes: number;
}

export interface RoutineInput {
  title: string;
  /** What the person told Bridge. Empty for routines made by hand */
  goal: string;
  days: Weekday[];
  /** "08:00" */
  start_time: string;
  steps: StepInput[];
}

export interface RoutineErrors {
  title?: string;
  steps?: string;
  /** Keyed by step index */
  step?: Record<number, { text?: string; minutes?: string }>;
  days?: string;
  start_time?: string;
}

export type CheckResult = { ok: true; value: RoutineInput } | { ok: false; errors: RoutineErrors };

/** Trims text and drops duplicate days. Run before checking or saving. */
export function cleanRoutine(input: RoutineInput): RoutineInput {
  return {
    title: input.title.trim(),
    goal: input.goal.trim(),
    days: WEEKDAYS.filter((d) => input.days.includes(d)),
    start_time: input.start_time.trim(),
    steps: input.steps.map((s) => ({ ...(s.id ? { id: s.id } : {}), text: s.text.trim(), minutes: s.minutes })),
  };
}

/** Messages are written for the person using the app: short and plain. */
export function checkRoutine(raw: RoutineInput): CheckResult {
  const input = cleanRoutine(raw);
  const errors: RoutineErrors = {};

  if (!input.title) errors.title = "Add a name for this routine.";
  else if (input.title.length > LIMITS.titleMax) errors.title = `Use ${LIMITS.titleMax} letters or fewer.`;

  if (input.steps.length < LIMITS.stepsMin) errors.steps = "Add at least one step.";
  else if (input.steps.length > LIMITS.stepsMax) errors.steps = `Use ${LIMITS.stepsMax} steps or fewer.`;

  input.steps.forEach((step, i) => {
    const stepErrors: { text?: string; minutes?: string } = {};
    if (!step.text) stepErrors.text = "Write what to do in this step.";
    else if (step.text.length > LIMITS.stepTextMax) stepErrors.text = `Use ${LIMITS.stepTextMax} letters or fewer.`;
    if (!Number.isInteger(step.minutes) || step.minutes < LIMITS.minutesMin || step.minutes > LIMITS.minutesMax) {
      stepErrors.minutes = `Pick ${LIMITS.minutesMin} to ${LIMITS.minutesMax} minutes.`;
    }
    if (stepErrors.text || stepErrors.minutes) (errors.step ??= {})[i] = stepErrors;
  });

  if (input.days.length === 0) errors.days = "Pick at least one day.";
  if (!TIME_OF_DAY.test(input.start_time)) errors.start_time = "Pick a time.";

  return Object.keys(errors).length === 0 ? { ok: true, value: input } : { ok: false, errors };
}

/** Errors that belong on the steps screen (the first screen of the editor). */
export function hasStepErrors(errors: RoutineErrors): boolean {
  return Boolean(errors.title || errors.steps || errors.step);
}

/** Checks a request body from the browser. Anything shaped wrong becomes a plain error. */
export function readRoutineInput(body: unknown): RoutineInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.title !== "string" || typeof b.start_time !== "string") return null;
  if (!Array.isArray(b.days) || !b.days.every((d) => (WEEKDAYS as readonly unknown[]).includes(d))) return null;
  if (!Array.isArray(b.steps)) return null;

  const steps: StepInput[] = [];
  for (const s of b.steps) {
    if (typeof s !== "object" || s === null) return null;
    const step = s as Record<string, unknown>;
    if (typeof step.text !== "string" || typeof step.minutes !== "number") return null;
    if (step.id !== undefined && typeof step.id !== "string") return null;
    steps.push({ ...(step.id ? { id: step.id as string } : {}), text: step.text, minutes: step.minutes });
  }

  return {
    title: b.title,
    goal: typeof b.goal === "string" ? b.goal : "",
    days: b.days as Weekday[],
    start_time: b.start_time,
    steps,
  };
}
