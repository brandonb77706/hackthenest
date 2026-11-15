"use client";

// In-app routine reminders (Nati): checks every 30 seconds while Bridge is
// open, and shows the design's banner at the top: 10 minutes before a
// routine, and a gentle nudge 10 minutes after if it hasn't started.
// Each reminder shows once per device. Lock-screen notifications are later.

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/bridge/Icon";
import { getServerSettings, getSettings, subscribeSettings } from "@/lib/settings";
import { addToInbox } from "./inbox";
import { reminderText } from "./reminderText";
import { REMINDER_POLL_MS, type RoutineReminder } from "./routineReminders";

const STORAGE_KEY = "bridge:routine-reminders:delivered:v1";

function deliveredIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(-200) : [];
  } catch {
    return [];
  }
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** A soft two-note chime, for people who turned Sound on. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch {
    // No sound available: the banner still shows.
  }
}

export function RoutineReminderMonitor() {
  const [reminder, setReminder] = useState<RoutineReminder | null>(null);
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);
  const { reminders: remindersOn, lateNudges, chime: chimeOn } = settings;

  useEffect(() => {
    if (!remindersOn && !lateNudges) return;
    let stopped = false;
    const poll = async () => {
      try {
        const delivered = deliveredIds();
        const query = new URLSearchParams({ delivered: delivered.join(","), tz: timeZone() });
        const response = await fetch(`/api/notifications/due?${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { reminders?: RoutineReminder[] };
        if (stopped) return;
        const next = body.reminders?.find((r) => (r.stage === "before" ? remindersOn : lateNudges));
        if (next && !delivered.includes(next.id)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...delivered, next.id].slice(-200)));
          const text = reminderText(next);
          addToInbox({ id: next.id, routineId: next.routineId, title: text.title, body: text.body, at: new Date().toISOString() });
          if (chimeOn) chime();
          setReminder(next);
        }
      } catch {
        // Offline or the database is busy: try again on the next tick.
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, REMINDER_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [remindersOn, lateNudges, chimeOn]);

  if (!reminder) return null;
  const text = reminderText(reminder);

  return (
    <section
      aria-label="Routine reminder"
      className="br-toast fixed left-1/2 top-3 z-40 box-border flex w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 flex-col gap-2.5 rounded-[20px] bg-ink px-4 py-3.5 text-canvas shadow-[0_10px_30px_rgba(15,53,80,0.28)]"
    >
      <span className="flex items-center gap-2 text-[15px] font-bold opacity-85">
        <Icon name="bell" size={16} strokeWidth={2.4} />
        Bridge · now
      </span>
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <strong className="font-display text-[19px] leading-tight">{text.title}</strong>
        <span className="text-[16px]">{text.body}</span>
      </div>
      <div className="flex gap-2.5">
        <Link
          href={`/play/${reminder.routineId}`}
          onClick={() => setReminder(null)}
          className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-cta font-display text-[17px] font-bold text-cta-ink no-underline"
        >
          Start now
        </Link>
        <button
          type="button"
          onClick={() => setReminder(null)}
          className="min-h-[46px] flex-1 rounded-xl border-2 border-canvas/40 bg-transparent font-display text-[17px] font-semibold text-canvas"
        >
          Later
        </button>
      </div>
    </section>
  );
}
