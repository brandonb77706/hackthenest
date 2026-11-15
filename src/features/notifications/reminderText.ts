import { formatTime } from "@/features/routine-builder/format";
import type { RoutineReminder } from "./routineReminders";

/** The banner's words, from the design: short, kind, one action. */
export function reminderText(r: RoutineReminder): { title: string; body: string } {
  const at = r.startTime ? ` at ${formatTime(r.startTime)}` : "";
  if (r.stage === "before") {
    const steps = r.stepCount ? ` It has ${r.stepCount} ${r.stepCount === 1 ? "step" : "steps"}.` : "";
    return { title: `${r.title}${at}`, body: `Starts in 10 minutes. Ready when you are.${steps}` };
  }
  return { title: `Time for ${r.title}`, body: "No rush. Want to start now, or get help?" };
}
