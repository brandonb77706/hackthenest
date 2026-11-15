"use client";

// Guardian Today, from the design: the person's day, what's up next, and what
// they've done. Only when they share their routines.

import { br } from "@/components/bridge/styles";
import { formatStepCount, formatTime } from "@/features/routine-builder/format";
import { dayProgress } from "../day";
import { usePersonDay } from "./usePersonDay";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });

export function GuardianToday({ personId, name }: { personId: string; name: string }) {
  const { day, error } = usePersonDay(personId);
  const who = day?.name || name;
  const routines = day?.routines ?? null;
  const progress = routines ? dayProgress(routines) : null;
  const next = routines?.find((r) => r.status === "next");

  return (
    <div className="flex flex-col gap-3.5 pb-[120px]">
      <header className="flex flex-col gap-2.5 rounded-b-[28px] bg-hero px-[22px] py-6 text-hero-ink shadow-[inset_0_-5px_0_var(--br-hero-edge)]">
        <span className="text-[17px] font-bold">
          {who}&apos;s day · {WEEKDAY.format(new Date())}
        </span>
        {progress ? (
          <>
            <h1 className="m-0 font-display text-[32px] font-bold leading-[1.05]">
              {progress.total === 0 ? "Nothing on today" : `${progress.done} of ${progress.total} done today`}
            </h1>
            {progress.total > 0 && (
              <div aria-hidden="true" className="flex gap-2">
                {Array.from({ length: progress.total }, (_, i) => (
                  <span key={i} className={`h-2.5 flex-1 rounded-full ${i < progress.done ? "bg-hero-ink" : "bg-hero-ink/15"}`} />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-full bg-surface px-3 py-1 font-display text-[16px] font-bold text-ink shadow-[0_3px_0_var(--br-hero-edge)]">
                {day?.streak ?? 0}-day streak
              </span>
              <span className="rounded-full bg-surface px-3 py-1 font-display text-[16px] font-bold text-ink shadow-[0_3px_0_var(--br-hero-edge)]">
                {day?.tokens ?? 0} coins
              </span>
            </div>
          </>
        ) : (
          <h1 className="m-0 font-display text-[30px] font-bold leading-[1.1]">{day ? "Not shared yet" : "Loading…"}</h1>
        )}
      </header>

      <div className="flex flex-col gap-3 px-4">
        {error && (
          <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
            Couldn&apos;t load {who}&apos;s day. Check your internet.
          </p>
        )}

        {day && !routines && (
          <div className="flex flex-col gap-1.5 rounded-[20px] bg-primary-soft px-4 py-4">
            <strong className="font-display text-[19px]">{who} hasn&apos;t shared their routines</strong>
            <span className="text-[17px]">
              They can turn on &ldquo;When I finish a routine&rdquo; for you on their Me tab. You can still add routines and
              contacts for them.
            </span>
          </div>
        )}

        {next && (
          <div className="tone-orange flex flex-col gap-2 rounded-[20px] border-2 border-tone-edge bg-tone-soft px-4 py-4">
            <span className="text-[14px] font-bold">UP NEXT · {formatTime(next.start_time)}</span>
            <strong className="font-display text-[21px]">{next.title}</strong>
            <span className="text-[16px]">
              {formatStepCount(next.step_count)}
              {next.steps_done > 0 ? `, ${next.steps_done} done so far` : ""}.
            </span>
          </div>
        )}

        {routines && (
          <>
            <h2 className={`${br.h2} mt-1.5 text-[22px]`}>Today</h2>
            {day?.feed && day.feed.length > 0 ? (
              <ul className={`${br.card} m-0 flex list-none flex-col overflow-hidden rounded-[20px] p-0`}>
                {day.feed.map((f, i) => (
                  <li key={i} className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t-2 border-line" : ""}`}>
                    <span className="w-[70px] shrink-0 pt-0.5 text-[15px] text-ink2">{formatTime(f.time)}</span>
                    <span className="flex flex-col">
                      <strong className="text-[17px]">{f.title}</strong>
                      <span className="text-[15px] text-ink2">{f.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">Nothing checked off yet today.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
