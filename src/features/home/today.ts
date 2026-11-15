// What's on today and what's done. Plain functions, no database.

import type { RoutineTone, Weekday } from "@/lib/types";
import { localNow } from "@/lib/time";

/** Only check-ins on the current local calendar date count toward today's steps. */
export function completedStepsOnDate(checkIns: { time: string; step_id: string }[], at: Date, timeZone: string): Set<string> {
  const date = localNow(at, timeZone).date;
  return new Set(checkIns.filter((checkIn) => {
    const time = new Date(checkIn.time);
    return !Number.isNaN(time.getTime()) && time <= at && localNow(time, timeZone).date === date;
  }).map((checkIn) => checkIn.step_id));
}

export interface DayRoutine {
  id: string;
  title: string;
  tone: RoutineTone;
  days: Weekday[];
  /** "HH:MM" */
  start_time: string;
  active: boolean;
  step_ids: string[];
}

export type RoutineStatus = "done" | "next" | "later" | "not_today";

export interface TodayRoutine {
  id: string;
  title: string;
  tone: RoutineTone;
  start_time: string;
  days: Weekday[];
  step_count: number;
  steps_done: number;
  status: RoutineStatus;
}

/**
 * Every active routine, earliest first, with its status for today:
 * done (every step finished today), next (the first one not done yet),
 * later (on today but after next), or not_today.
 */
export function summarizeDay(input: {
  routines: DayRoutine[];
  /** Step ids finished today */
  doneStepIds: Set<string>;
  weekday: Weekday;
}): TodayRoutine[] {
  const sorted = input.routines
    .filter((r) => r.active)
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.title.localeCompare(b.title));

  let nextFound = false;
  return sorted.map((r) => {
    const stepsDone = r.step_ids.filter((id) => input.doneStepIds.has(id)).length;
    const onToday = r.days.includes(input.weekday);
    const done = onToday && r.step_ids.length > 0 && stepsDone === r.step_ids.length;
    let status: RoutineStatus = "not_today";
    if (onToday) {
      if (done) status = "done";
      else if (!nextFound) {
        status = "next";
        nextFound = true;
      } else status = "later";
    }
    return {
      id: r.id,
      title: r.title,
      tone: r.tone,
      start_time: r.start_time,
      days: r.days,
      step_count: r.step_ids.length,
      steps_done: stepsDone,
      status,
    };
  });
}
