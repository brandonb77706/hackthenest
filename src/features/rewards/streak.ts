// Daily streaks. A streak day is a day with at least one finished routine
// (docs/rewards.md). Plain functions, no database, so they are easy to test.
//
// Streaks never punish: a saved freeze covers one missed day, and a broken
// streak never takes away tokens or Buddies already earned.
// The milestone bonus itself is streakBonus() in earning.ts.

import type { Avatar } from "@/lib/types";

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  /** "YYYY-MM-DD" of the last streak day, or null */
  last_streak_date: string | null;
}

/** The day before a "YYYY-MM-DD" date. */
export function dayBefore(date: string): string {
  return new Date(new Date(`${date}T12:00:00Z`).getTime() - 864e5).toISOString().slice(0, 10);
}

/**
 * The streak after finishing a routine today. Same day: no change.
 * Yesterday: one more day. Missed exactly one day with a freeze saved: the
 * freeze covers it. Otherwise a new streak starts at 1.
 */
export function advanceStreak(state: StreakState, today: string): StreakState & { changed: boolean; usedFreeze: boolean } {
  const last = state.last_streak_date;
  if (last === today) return { ...state, changed: false, usedFreeze: false };
  const yesterday = dayBefore(today);
  let current = 1;
  let freezes = state.streak_freezes;
  let usedFreeze = false;
  if (last === yesterday) current = state.current_streak + 1;
  else if (last === dayBefore(yesterday) && freezes > 0 && state.current_streak > 0) {
    current = state.current_streak + 1;
    freezes -= 1;
    usedFreeze = true;
  }
  return {
    current_streak: current,
    longest_streak: Math.max(state.longest_streak, current),
    streak_freezes: freezes,
    last_streak_date: today,
    changed: true,
    usedFreeze,
  };
}

/** The streak to show today: still going if the last streak day was today or yesterday (or a freeze covers one day). */
export function liveStreak(state: StreakState, today: string): number {
  const last = state.last_streak_date;
  if (!last) return 0;
  if (last === today || last === dayBefore(today)) return state.current_streak;
  if (last === dayBefore(dayBefore(today)) && state.streak_freezes > 0) return state.current_streak;
  return 0;
}

/** Streak Buddies this streak has reached that the user doesn't have yet. */
export function streakBuddiesToUnlock<T extends Pick<Avatar, "id" | "unlock_type" | "streak_required">>(
  days: number,
  catalog: T[],
  ownedIds: string[],
): T[] {
  const owned = new Set(ownedIds);
  return catalog.filter(
    (a) => a.unlock_type === "streak" && a.streak_required !== null && a.streak_required <= days && !owned.has(a.id),
  );
}
