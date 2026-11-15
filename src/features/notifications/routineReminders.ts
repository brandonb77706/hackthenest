import type { CheckIn, Routine, Weekday } from "@/lib/types";

export const ROUTINE_TIME_ZONE = "America/New_York";
export const REMINDER_POLL_MS = 30_000;
export type ReminderStage = "before" | "late";
export interface RoutineReminder { id: string; routineId: string; title: string; stage: ReminderStage; dueAt: string; }

const weekday: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ROUTINE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}
export function easternDate(date: Date): string {
  const p = easternParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Current scheduled occurrence in Eastern wall time. Routines with no days never fire. */
export function routineOccurrence(routine: Pick<Routine, "id" | "title" | "days" | "start_time" | "active">, now: Date): { date: string; startAt: number } | null {
  if (!routine.active || !routine.days.length || !/^\d{2}:\d{2}$/.test(routine.start_time)) return null;
  const p = easternParts(now);
  const date = easternDate(now);
  const day = weekday[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday)];
  if (!routine.days.includes(day)) return null;
  const [hour, minute] = routine.start_time.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  // Find the UTC instant whose Eastern wall clock matches the routine. Iteration handles DST.
  const desired = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, minute);
  let instant = desired;
  for (let i = 0; i < 3; i++) {
    const q = easternParts(new Date(instant));
    const represented = Date.UTC(Number(q.year), Number(q.month) - 1, Number(q.day), Number(q.hour), Number(q.minute));
    instant += desired - represented;
  }
  return { date, startAt: instant };
}

/** At most one due item per stage; two-minute grace tolerates a sleeping tab. */
export function dueRoutineReminders(
  routines: Array<Pick<Routine, "id" | "title" | "days" | "start_time" | "active">>,
  checkedInRoutineIds: ReadonlySet<string>, now: Date, alreadyDelivered: ReadonlySet<string> = new Set(),
): RoutineReminder[] {
  const result: RoutineReminder[] = [];
  for (const routine of routines) {
    const started = checkedInRoutineIds.has(routine.id);
    for (const stage of ["before", "late"] as const) {
      if (started && stage === "late") continue;
      const offset = stage === "before" ? -10 : 10;
      const occurrence = routineOccurrence(routine, new Date(now.getTime() - offset * 60_000));
      if (!occurrence) continue;
      const dueAt = occurrence.startAt + offset * 60_000;
      if (now.getTime() < dueAt || now.getTime() >= dueAt + 2 * 60_000) continue;
      const id = `${routine.id}:${occurrence.date}:${routine.start_time.replace(":", "")}:${stage}`;
      if (!alreadyDelivered.has(id)) result.push({ id, routineId: routine.id, title: routine.title, stage, dueAt: new Date(dueAt).toISOString() });
    }
  }
  return result;
}

/** Any step check-in on the scheduled Eastern calendar day counts as started. */
export function checkedInToday(checkIns: Array<Pick<CheckIn, "routine_id" | "time">>, date: string): Set<string> {
  const result = new Set<string>();
  for (const checkIn of checkIns) {
    if (easternDate(new Date(checkIn.time)) === date) result.add(checkIn.routine_id);
  }
  return result;
}
