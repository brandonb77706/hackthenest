// Routine builder (owner: Brandon). Source: docs/ai-prompts.md section 1.

import type { SupportLevel } from "@/lib/types";
import { fail, fillTemplate, isNonEmptyString, isPositiveNumber, isRecord, ok, type ParseResult } from "./parse";

export interface RoutineDraftStep {
  order: number;
  text: string;
  minutes: number;
  image_prompt: string;
}

export interface RoutineDraft {
  title: string;
  steps: RoutineDraftStep[];
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

const TEMPLATE = `You help a person with a disability build a daily routine they can follow on their own.
Goal: {goal}
Support level: {support_level} (high = very small steps, low = fewer, bigger steps)

Rules:
- Aim for about 4 to 10 steps for high, 3 to 6 for medium, 2 to 4 for low. A short, simple task can have fewer steps. Never add filler steps.
- Each step is one action, under 10 words, plain language, starts with a verb.
- Give realistic minutes per step.
- For each step, write an image_prompt: a simple, friendly flat illustration of the action, no text in the image.
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
          image_prompt: { type: "string" },
        },
        required: ["order", "text", "minutes", "image_prompt"],
      },
    },
  },
  required: ["title", "steps"],
} as const;

/** Checks the AI's routine. Steps come back sorted and numbered 1, 2, 3... */
export function parseRoutine(raw: unknown): ParseResult<RoutineDraft> {
  if (!isRecord(raw)) return fail("Response is not an object");
  if (!isNonEmptyString(raw.title)) return fail("Missing title");
  if (!Array.isArray(raw.steps)) return fail("Missing steps");

  const steps: RoutineDraftStep[] = [];
  for (const [i, step] of raw.steps.entries()) {
    if (!isRecord(step)) return fail(`Step ${i + 1} is not an object`);
    if (!isNonEmptyString(step.text)) return fail(`Step ${i + 1} is missing text`);
    if (!isPositiveNumber(step.minutes)) return fail(`Step ${i + 1} is missing minutes`);
    if (!isNonEmptyString(step.image_prompt)) return fail(`Step ${i + 1} is missing image_prompt`);
    steps.push({
      order: typeof step.order === "number" ? step.order : i + 1,
      text: step.text.trim(),
      minutes: step.minutes,
      image_prompt: step.image_prompt.trim(),
    });
  }

  if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) {
    return fail(`Expected ${MIN_STEPS} to ${MAX_STEPS} steps, got ${steps.length}`);
  }

  steps.sort((a, b) => a.order - b.order);
  steps.forEach((step, i) => (step.order = i + 1));

  return ok({ title: raw.title.trim(), steps });
}
