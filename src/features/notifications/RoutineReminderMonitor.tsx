"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
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

  if (!reminder) return null;
  const message = reminder.stage === "before"
    ? `${reminder.title} starts in 10 minutes.`
    : `${reminder.title} was scheduled to start 10 minutes ago. Have you started?`;
  return (
    <section aria-label="Routine reminder" className="overflow-hidden rounded-[20px] border-2 border-cta-edge bg-surface text-ink shadow-[0_5px_0_var(--br-cta-edge)]">
      <div className="flex items-center gap-3 bg-cta px-4 py-3 font-display text-[19px] font-bold text-cta-ink"><Icon name="clock" size={24} /> Routine reminder</div>
      <div className="p-4">
        <p role="status" aria-live="polite" className="mb-3 mt-0 text-[18px] leading-snug">{message}</p>
        <button type="button" onClick={() => setReminder(null)} className={`${br.ghost} min-h-12 rounded-[14px] px-4 text-[17px]`}>Dismiss reminder</button>
      </div>
    </section>
  );
}
