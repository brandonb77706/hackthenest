// Dates and times in the user's own time zone. The browser sends its zone
// (Intl.DateTimeFormat().resolvedOptions().timeZone) so "today" means their day.

import { WEEKDAYS, type Weekday } from "@/lib/types";

export interface LocalNow {
  /** "YYYY-MM-DD" */
  date: string;
  weekday: Weekday;
  /** Minutes since midnight */
  minutes: number;
}

function validZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** The date, weekday, and time at a moment in a time zone. Unknown zones fall back to UTC. */
export function localNow(at: Date, timeZone: string): LocalNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: validZone(timeZone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const weekday = String(parts.weekday).slice(0, 3).toLowerCase() as Weekday;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.includes(weekday) ? weekday : "mon",
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** "Good morning" / "Good afternoon" / "Good evening" for an hour of the day. */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
