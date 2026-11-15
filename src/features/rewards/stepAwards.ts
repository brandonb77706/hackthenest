// Decides which tokens one "Done" tap earns, from facts the server loaded from the database.
// Plain function: no database, no UI. The server works these facts out itself; it never trusts
// the phone to say "I finished the routine."

import type { ID } from "@/lib/types";
import { awardsForStepDone, type TokenAward } from "./earning";

export interface StepDoneFacts {
  /** The step that was just tapped Done */
  stepId: ID;
  /** Every step in that routine */
  routineStepIds: ID[];
  /** Steps that already had a "done" check-in today, before this tap */
  doneTodayBefore: ID[];
  /** True if the user already got the first routine bonus at some point */
  hasFirstRoutineAward: boolean;
  /** Ignored on purpose: help earns the same tokens */
  usedHelp?: boolean;
}

/**
 * The awards for this tap. Empty when it shouldn't pay:
 * - the step was already done today (double tap, or doing the routine again), or
 * - the step isn't part of the routine.
 * The routine bonus is paid only by the tap that completes the routine today.
 */
export function awardsForCheckIn(facts: StepDoneFacts): TokenAward[] {
  const routine = new Set(facts.routineStepIds);
  const before = new Set(facts.doneTodayBefore);
  if (!routine.has(facts.stepId) || before.has(facts.stepId)) return [];

  const after = new Set(before).add(facts.stepId);
  const finishedRoutine = [...routine].every((id) => after.has(id));

  return awardsForStepDone({
    finishedRoutine,
    firstRoutineEver: !facts.hasFirstRoutineAward,
    usedHelp: facts.usedHelp,
  });
}
