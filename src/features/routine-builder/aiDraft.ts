// "Tell Bridge": the AI drafts a routine from what the person said.
// Nothing here saves anything. The draft opens in the editor for review.

import { ai, type AIProvider } from "@/lib/ai";
import { buildRoutinePrompt, parseRoutine, routineSchema, type RoutineDraft } from "@/lib/ai/prompts/routineBuilder";
import { WEEKDAYS, type SupportLevel } from "@/lib/types";
import { LIMITS, type RoutineInput } from "./routineInput";

export { biggerSteps, cleanGoal, MAX_GOAL_CHARS, smallerSteps } from "./supportLevel";

/** Asked again once if the first answer fails the check. */
const ATTEMPTS = 2;

export type DraftResult = { ok: true; routine: RoutineInput } | { ok: false; reason: "bad_answer" | "ai_error" };

/** Cuts text to a length at a word boundary, so steps never end mid-word. */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : text.slice(0, max)).trim();
}

/**
 * Fits the AI's draft into the editor's limits so it opens ready to save.
 * Days default to every day and time to 8:00 when the person didn't say.
 */
export function draftToRoutineInput(draft: RoutineDraft, goal: string): RoutineInput {
  return {
    title: shorten(draft.title, LIMITS.titleMax),
    goal,
    days: draft.days ?? [...WEEKDAYS],
    start_time: draft.start_time ?? "08:00",
    tone: "teal",
    remind: true,
    steps: draft.steps.slice(0, LIMITS.stepsMax).map((step) => ({
      text: shorten(step.text, LIMITS.stepTextMax),
      minutes: Math.min(LIMITS.minutesMax, Math.max(LIMITS.minutesMin, Math.round(step.minutes))),
    })),
  };
}

export async function draftRoutine(
  goal: string,
  supportLevel: SupportLevel,
  provider: AIProvider = ai.forFeature("routineBuilder"),
): Promise<DraftResult> {
  const prompt = buildRoutinePrompt({ goal, supportLevel });
  let reason: "bad_answer" | "ai_error" = "bad_answer";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const raw = await provider.generateJSON({ prompt, schema: routineSchema });
      const parsed = parseRoutine(raw);
      if (parsed.ok) return { ok: true, routine: draftToRoutineInput(parsed.value, goal) };
      reason = "bad_answer";
      console.warn(`[routine draft] attempt ${attempt}: ${parsed.error}`);
    } catch (error) {
      reason = "ai_error";
      console.warn(`[routine draft] attempt ${attempt}:`, error instanceof Error ? error.message : error);
    }
  }
  return { ok: false, reason };
}
