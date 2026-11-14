import { WEEKDAYS, type Weekday } from "@/lib/types";

export const DAY_NAMES: Record<Weekday, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

/** "08:00" → "8:00 AM", "21:30" → "9:30 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return time;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Every day", "Weekdays", "Weekends", or "Monday, Wednesday" */
export function formatDays(days: Weekday[]): string {
  const set = new Set(days);
  if (set.size === 0) return "No days set";
  if (set.size === 7) return "Every day";
  const weekend = set.has("sat") && set.has("sun");
  const weekdayCount = WEEKDAYS.filter((d) => d !== "sat" && d !== "sun" && set.has(d)).length;
  if (set.size === 5 && weekdayCount === 5) return "Weekdays";
  if (set.size === 2 && weekend) return "Weekends";
  return WEEKDAYS.filter((d) => set.has(d))
    .map((d) => DAY_NAMES[d].long)
    .join(", ");
}

/** "1 step", "4 steps" */
export function formatStepCount(count: number): string {
  return `${count} ${count === 1 ? "step" : "steps"}`;
}
