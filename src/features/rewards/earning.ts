// How many tokens each action earns (docs/rewards.md). Plain functions: no database, no UI.
// Rules: tokens are never taken away, and using help earns exactly the same tokens.

import type { TokenReason } from "@/lib/types";

/** Every reason except "purchase": purchases are the only negative amounts. */
export type EarnReason = Exclude<TokenReason, "purchase">;

export interface TokenAward {
  /** Always more than 0 */
  amount: number;
  reason: EarnReason;
}

export const TOKENS_FOR = {
  step: 5,
  routine: 20,
  camera: 10,
  first_routine: 50,
} as const;

/** Streak bonuses, paid once on the day the streak reaches each length. */
export const STREAK_MILESTONES = [
  { days: 3, tokens: 25 },
  { days: 7, tokens: 50 },
  { days: 14, tokens: 100 },
  { days: 30, tokens: 200 },
] as const;

export interface StepDoneInput {
  /** True when this step was the last one left in the routine */
  finishedRoutine: boolean;
  /** True when this is the first routine the user has ever finished */
  firstRoutineEver: boolean;
  /**
   * Whether the user pressed "I'm stuck" or used camera help on this step.
   * It is ignored on purpose: help earns the same tokens.
   */
  usedHelp?: boolean;
}

/** The tokens to give when a step is marked done. */
export function awardsForStepDone(input: StepDoneInput): TokenAward[] {
  const awards: TokenAward[] = [{ amount: TOKENS_FOR.step, reason: "step" }];
  if (input.finishedRoutine) {
    awards.push({ amount: TOKENS_FOR.routine, reason: "routine" });
    if (input.firstRoutineEver) {
      awards.push({ amount: TOKENS_FOR.first_routine, reason: "first_routine" });
    }
  }
  return awards;
}

/** The bonus for reaching a streak milestone today, or null if today's streak length isn't one. */
export function streakBonus(streakDays: number): TokenAward | null {
  const milestone = STREAK_MILESTONES.find((m) => m.days === streakDays);
  return milestone ? { amount: milestone.tokens, reason: "streak" } : null;
}

/** Adds up a list of awards. */
export function totalAwarded(awards: TokenAward[]): number {
  return awards.reduce((sum, award) => sum + award.amount, 0);
}
