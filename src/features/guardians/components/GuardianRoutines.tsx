"use client";

// Guardian Routines, from the design: the person's routines and "+ New".
// The guardian can change or delete any routine when the person shares their
// routines, or the ones the guardian added when they don't.

import Link from "next/link";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { formatDays, formatStepCount, formatTime } from "@/features/routine-builder/format";
import { statusLabel } from "../day";
import { usePersonDay } from "./usePersonDay";

export function GuardianRoutines({ personId, name }: { personId: string; name: string }) {
  const { day, error } = usePersonDay(personId);
  const who = day?.name || name;
  const shared = Boolean(day?.routines);
  const list = day ? (day.routines ?? day.added) : [];

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[120px] pt-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 font-display text-[32px] font-bold">Routines</h1>
        <Link
          href={`/guardian/${personId}/new`}
          aria-label={`Make a routine for ${who}`}
          className={`${br.ghost} flex h-12 items-center gap-1.5 rounded-[14px] px-4 text-[17px] no-underline`}
        >
          <Icon name="plus" size={20} strokeWidth={2.6} />
          New
        </Link>
      </div>

      {error && (
        <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
          Couldn&apos;t load routines. Check your internet.
        </p>
      )}
      {!day && !error && <p className="m-0 text-ink2">Loading…</p>}
      {day && !shared && (
        <p className="m-0 rounded-2xl bg-primary-soft px-4 py-3.5 text-[17px]">
          {who} hasn&apos;t shared their routines. You can see and change only the ones you added.
        </p>
      )}
      {day && list.length === 0 && (
        <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">
          {shared ? "No routines yet." : "You haven't added any routines yet."} Tap New to make one for {who}.
        </p>
      )}

      {list.map((r) => (
        <div
          key={r.id}
          className={`tone-${r.tone} flex flex-col overflow-hidden rounded-[20px] border-2 border-tone-edge bg-surface shadow-[0_4px_0_var(--t-edge)]`}
        >
          <span className="flex items-center justify-between gap-2.5 bg-tone px-4 py-3.5 text-tone-ink">
            <strong className="font-display text-[21px]">{r.title}</strong>
            <span className="shrink-0 text-[15px] font-bold">{formatTime(r.start_time)}</span>
          </span>
          <span className="flex items-center justify-between gap-2 px-4 pt-3 text-[16px]">
            <span className="text-ink2">
              {formatStepCount(r.step_count)} · {formatDays(r.days)}
            </span>
            {shared && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[15px] font-bold ${r.status === "done" ? "bg-go-soft" : "bg-sunken"}`}>
                {statusLabel(r)}
              </span>
            )}
          </span>
          <span className="flex justify-end px-3 pb-2">
            <Link href={`/guardian/${personId}/edit/${r.id}`} aria-label={`Edit ${r.title}`} className={`${br.link} flex items-center`}>
              Edit
            </Link>
          </span>
        </div>
      ))}
    </div>
  );
}
