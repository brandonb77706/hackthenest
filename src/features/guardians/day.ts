// What a guardian sees of someone's day. Plain functions, no database.
// Only used when the person shares their routines (can_see_routines).

import type { TodayRoutine } from "@/features/home/today";
import { localNow } from "@/lib/time";

export interface FeedItem {
  /** "HH:MM" in the guardian's time zone */
  time: string;
  title: string;
  sub: string;
}

/** Today's routines: how many are done out of how many are on today. */
export function dayProgress(routines: TodayRoutine[]): { done: number; total: number } {
  const today = routines.filter((r) => r.status !== "not_today");
  return { done: today.filter((r) => r.status === "done").length, total: today.length };
}

function hhmm(at: Date, timeZone: string): string {
  const { minutes } = localNow(at, timeZone);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Today's activity, newest first: finished routines, and routines started but
 * not finished. Built from the steps checked off today.
 */
export function dayFeed(
  routines: TodayRoutine[],
  checkIns: { routine_id: string; time: string }[],
  timeZone: string,
): FeedItem[] {
  const byRoutine = new Map<string, Date[]>();
  for (const c of checkIns) byRoutine.set(c.routine_id, [...(byRoutine.get(c.routine_id) ?? []), new Date(c.time)]);

  const items: { at: Date; item: FeedItem }[] = [];
  for (const r of routines) {
    const times = byRoutine.get(r.id);
    if (!times || times.length === 0 || r.steps_done === 0) continue;
    const last = new Date(Math.max(...times.map((t) => t.getTime())));
    const steps = `${r.steps_done} of ${r.step_count} ${r.step_count === 1 ? "step" : "steps"}`;
    items.push({
      at: last,
      item:
        r.status === "done"
          ? { time: hhmm(last, timeZone), title: `Finished ${r.title}`, sub: steps }
          : { time: hhmm(last, timeZone), title: `Working on ${r.title}`, sub: `${steps} done` },
    });
  }
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).map((x) => x.item);
}

/** The words for one routine's status, for the guardian's Routines tab. */
export function statusLabel(r: TodayRoutine): string {
  switch (r.status) {
    case "done":
      return "Done today";
    case "next":
      return r.steps_done > 0 ? `${r.steps_done} of ${r.step_count} done` : "Up next";
    case "later":
      return "Later today";
    case "not_today":
      return "Not today";
  }
}

/** What the person shares, in words for the guardian. Empty when nothing is shared. */
export function sharedList(shares: {
  can_see_routines: boolean;
  can_get_lost_alerts: boolean;
  can_get_stuck_alerts: boolean;
}): string[] {
  return [
    shares.can_see_routines ? "Their routines and when they finish one" : null,
    shares.can_get_lost_alerts ? "Their location, only when they tap I'm lost" : null,
    shares.can_get_stuck_alerts ? "When they're stuck on a step" : null,
  ].filter((x): x is string => x !== null);
}
