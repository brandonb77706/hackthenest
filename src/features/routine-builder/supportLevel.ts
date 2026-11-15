// Small helpers shared by the browser and the server for "Tell Bridge".
// Keep this file free of server imports (AI layer, database).

import type { SupportLevel } from "@/lib/types";

export const MAX_GOAL_CHARS = 300;

/** One level more support: smaller, more detailed steps. */
export function smallerSteps(level: SupportLevel): SupportLevel {
  return level === "low" ? "medium" : "high";
}

/** One level less support: fewer, bigger steps. */
export function biggerSteps(level: SupportLevel): SupportLevel {
  return level === "high" ? "medium" : "low";
}

export function cleanGoal(goal: unknown): string | null {
  if (typeof goal !== "string") return null;
  const cleaned = goal.replace(/\s+/g, " ").trim();
  return cleaned && cleaned.length <= MAX_GOAL_CHARS ? cleaned : null;
}
