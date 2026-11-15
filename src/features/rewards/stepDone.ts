import type { TokenAward } from "./earning";

/** What POST /api/routines/:id/steps/:stepId/done answers, so the step player can show it. */
export interface StepDoneResponse {
  /** Tokens this tap earned, 0 or more */
  earned: number;
  awards: TokenAward[];
  /** True when this tap finished the routine for today (the first time today) */
  finished_routine: boolean;
  /** The streak, when finishing the routine moved it */
  streak: number | null;
  /** Streak Buddies unlocked by this tap */
  unlocked: string[];
}
