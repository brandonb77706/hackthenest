// Routine builder (owner: Brandon). Source: docs/ai-prompts.md section 1.

import { WEEKDAYS, type SupportLevel, type Weekday } from "@/lib/types";
import { fail, fillTemplate, isNonEmptyString, isPositiveNumber, isRecord, ok, type ParseResult } from "./parse";

export interface RoutineDraftStep {
  order: number;
  text: string;
  minutes: number;
}

export interface RoutineDraft {
  title: string;
  steps: RoutineDraftStep[];
  /** Only when the person said which days */
  days?: Weekday[];
  /** "HH:MM", only when the person said a time */
  start_time?: string;
}

/**
 * How many steps the AI should aim for at each support level. This is guidance
 * in the prompt, not a hard rule: a short task like "take my medicine" can be
 * 2 steps even at high support, and the person edits the steps before saving.
 */
export const STEP_TARGETS: Record<SupportLevel, { min: number; max: number }> = {
  high: { min: 4, max: 10 },
  medium: { min: 3, max: 6 },
  low: { min: 2, max: 4 },
};

/** Hard limits on what the AI can return. Matches the routine editor's limits. */
export const MIN_STEPS = 1;
export const MAX_STEPS = 15;

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

const TEMPLATE = `You help a person with a disability build a routine they can follow on their own.
They said: {goal}
Support level: {support_level} (high = very small steps, low = fewer, bigger steps)

Rules:
- Aim for about 4 to 10 steps for high, 3 to 6 for medium, 2 to 4 for low. A short, simple task can have fewer steps. Never add filler steps.
- Each step is one action, under 10 words, plain language, starts with a verb.
- Give realistic whole minutes per step.
- Give the routine a short title, 2 to 4 words.
- If they said which days, set "days" using mon, tue, wed, thu, fri, sat, sun. "Every day" means all seven. "start_time" is when the routine begins, as 24-hour "HH:MM". If they said when to start, use that. If they said when something happens, like "my 9am shift", start early enough to finish all the steps before it. If they didn't say a time, leave these out. Never guess.
- No medical advice. Never add a medicine name, dose, or time the person didn't say. "Take your pill" is fine; "Take 200mg of ibuprofen" is not.

Return JSON only.`;

export function buildRoutinePrompt(input: { goal: string; supportLevel: SupportLevel }): string {
  return fillTemplate(TEMPLATE, { goal: input.goal.trim(), support_level: input.supportLevel });
}

export const routineSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "number" },
          text: { type: "string" },
          minutes: { type: "number" },
        },
        required: ["order", "text", "minutes"],
      },
    },
    days: { type: "array", items: { type: "string", enum: [...WEEKDAYS] } },
    start_time: { type: "string" },
  },
  required: ["title", "steps"],
} as const;

/**
 * Checks the AI's routine. Steps come back sorted and numbered 1, 2, 3...
 * Days and time are optional: anything that isn't a real day or time is
 * dropped instead of guessed.
 */
export function parseRoutine(raw: unknown): ParseResult<RoutineDraft> {
  if (!isRecord(raw)) return fail("Response is not an object");
  if (!isNonEmptyString(raw.title)) return fail("Missing title");
  if (!Array.isArray(raw.steps)) return fail("Missing steps");

  const steps: RoutineDraftStep[] = [];
  for (const [i, step] of raw.steps.entries()) {
    if (!isRecord(step)) return fail(`Step ${i + 1} is not an object`);
    if (!isNonEmptyString(step.text)) return fail(`Step ${i + 1} is missing text`);
    if (!isPositiveNumber(step.minutes)) return fail(`Step ${i + 1} is missing minutes`);
    steps.push({
      order: typeof step.order === "number" ? step.order : i + 1,
      text: step.text.trim(),
      minutes: step.minutes,
    });
  }

  if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) {
    return fail(`Expected ${MIN_STEPS} to ${MAX_STEPS} steps, got ${steps.length}`);
  }

  steps.sort((a, b) => a.order - b.order);
  steps.forEach((step, i) => (step.order = i + 1));

  const draft: RoutineDraft = { title: raw.title.trim(), steps };

  if (Array.isArray(raw.days)) {
    const days = WEEKDAYS.filter((d) => (raw.days as unknown[]).includes(d));
    if (days.length > 0) draft.days = days;
  }
  if (typeof raw.start_time === "string" && TIME_OF_DAY.test(raw.start_time.trim())) {
    draft.start_time = raw.start_time.trim();
  }

  return ok(draft);
}
