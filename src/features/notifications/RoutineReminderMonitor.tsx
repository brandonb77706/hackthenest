"use client";

import { useEffect, useState } from "react";
import { REMINDER_POLL_MS, type RoutineReminder } from "./routineReminders";

const STORAGE_KEY = "bridge:routine-reminders:delivered:v1";
function deliveredIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(-200) : [];
  } catch { return []; }
}

export function RoutineReminderMonitor() {
  const [reminder, setReminder] = useState<RoutineReminder | null>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const delivered = deliveredIds();
        const query = new URLSearchParams({ delivered: delivered.join(",") });
        const response = await fetch(`/api/notifications/due?${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { reminders?: RoutineReminder[] };
        if (stopped) return;
        const next = body.reminders?.[0];
        if (next && !delivered.includes(next.id)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...delivered, next.id].slice(-200)));
          setReminder(next);
        }
      } catch { /* Offline or DB temporarily unavailable: retry on the next tick. */ }
    };
    void poll();
    const timer = window.setInterval(() => { if (!document.hidden) void poll(); }, REMINDER_POLL_MS);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  if (!reminder) return <p role="status" className="text-lg">Routine reminders check every 30 seconds while this page is open. Time zone: Eastern.</p>;
  const message = reminder.stage === "before"
    ? `${reminder.title} starts in 10 minutes.`
    : `${reminder.title} was scheduled to start 10 minutes ago. Have you started?`;
  return (
    <section aria-label="Routine reminder" style={{ border: "2px solid #163e85", padding: 16, borderRadius: 12, background: "white", color: "#172033" }}>
      <p role="status" aria-live="polite" style={{ fontSize: 18 }}>{message}</p>
      <button type="button" onClick={() => setReminder(null)} style={{ minHeight: 48, padding: 12, border: "2px solid", font: "inherit" }}>Dismiss reminder</button>
    </section>
  );
}
