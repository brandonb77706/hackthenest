// How close the user's streak is to the next streak reward. Plain function: no database, no UI.
// Returns the same shape as nextReward() so the Me screen can show it with the same progress bar.
// The bar counts from day 0, so it never drops back to empty after a milestone.

import type { Avatar } from "@/lib/types";
import { formatTokens, type NextReward } from "@/features/me/summary";
import { STREAK_MILESTONES } from "./earning";

export interface StreakProgressOptions {
  /** Streak freezes the user has saved; shown as a reassuring line. */
  freezes?: number;
  /** Streak Buddies from the avatar catalog, to name the one waiting at the next milestone. */
  streakBuddies?: Pick<Avatar, "name" | "streak_required">[];
}

/** Turns any input into a whole number of days, 0 or more. */
function cleanCount(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function streakProgress(days: number, options: StreakProgressOptions = {}): NextReward {
  const current = cleanCount(days);
  const freezes = cleanCount(options.freezes);
  const freezeLine = freezes > 0 ? ` ${plural(freezes, "freeze", "freezes")} saved.` : "";
  const label = `Streak: ${plural(current, "day", "days")}`;

  if (current === 0) {
    return { label, percent: 0, detail: `Do one routine today to start your streak.${freezeLine}` };
  }

  const next = STREAK_MILESTONES.find((m) => m.days > current);
  if (!next) {
    return { label, percent: 100, detail: `You reached every streak reward.${freezeLine}` };
  }

  const buddy = options.streakBuddies?.find((b) => b.streak_required === next.days);
  const prize = buddy ? `${formatTokens(next.tokens)} and ${buddy.name}` : formatTokens(next.tokens);
  const left = next.days - current;

  return {
    label,
    percent: Math.min(100, Math.round((current / next.days) * 100)),
    detail: `${plural(left, "more day", "more days")} to get ${prize}.${freezeLine}`,
  };
}
