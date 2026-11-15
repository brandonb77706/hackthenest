"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { routineIcon } from "@/features/home/routineIcon";
import type { RoutineStatus } from "@/features/home/today";
import { ManagedNote } from "@/features/guardians/components/ManagedNote";
import { useToday } from "@/features/home/useToday";
import { formatDays, formatStepCount, formatTime } from "../format";

const BADGE: Record<RoutineStatus, string> = { done: "Done", next: "Next", later: "Later", not_today: "Not today" };

/** The Routines tab: every routine as a card. Tap a card to start it. */
export function RoutinesScreen() {
  const { today, loading, error } = useToday();
  const [showAll, setShowAll] = useState(false);
  const allRoutines = today?.routines ?? [];
  const routines = showAll ? allRoutines : allRoutines.filter((routine) => routine.status !== "not_today");
  // A guardian can turn off making and changing routines. Doing them is never limited.
  const rule = today?.edit?.routines;
  const canEdit = rule?.allowed !== false;

  return (
    <div className="flex flex-col gap-4 px-4 pb-[130px] pt-7">
      <div className="flex items-center justify-between">
        <h1 className="m-0 font-display text-[32px] font-bold">Routines</h1>
        {canEdit && (
        <Link
          href="/routines/new"
          aria-label="Make a new routine"
          className={`${br.ghost} flex h-12 items-center gap-1.5 rounded-[14px] px-4 text-[17px] no-underline`}
        >
          <Icon name="plus" size={20} strokeWidth={2.6} />
          New
        </Link>
        )}
      </div>
      {rule && !canEdit && <ManagedNote area="routines" rule={rule} />}

      {allRoutines.some((routine) => routine.status === "not_today") && (
        <button type="button" className={`${br.ghost} min-h-12 rounded-2xl px-4 text-[18px]`} aria-pressed={showAll} onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show today's routines" : "Show all routines"}
        </button>
      )}

      {loading && <p role="status" className="m-0">Loading your routines…</p>}
      {error && (
        <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-5 py-4 font-bold text-danger-text">
          {error}
        </p>
      )}
      {!loading && !error && routines.length === 0 && (
        <p className="m-0 rounded-[14px] bg-sunken px-4 py-3.5 text-[16px]">
          {allRoutines.length > 0 && !showAll ? "No routines are scheduled for today." : canEdit ? "You don't have any routines yet. Tap New to make your first one." : "You don't have any routines yet."}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {routines.map((r) => (
          <li
            key={r.id}
            className={`tone-${r.tone} overflow-hidden rounded-[20px] border-2 border-tone-edge bg-surface text-ink shadow-[0_5px_0_var(--t-edge)]`}
          >
            <Link href={`/play/${r.id}`} aria-label={`Start ${r.title}`} className="br-press block text-ink no-underline">
              <span className="box-border flex w-full items-center gap-3.5 bg-tone p-[18px] text-tone-ink">
                <Icon name={routineIcon(r.start_time)} size={34} />
                <span className="font-display text-[23px] font-bold leading-[1.15]">{r.title}</span>
              </span>
              <span className="box-border flex w-full items-center justify-between gap-2 px-[18px] pt-3.5 text-[17px]">
                <span className="text-ink2">
                  {formatTime(r.start_time)} · {formatStepCount(r.step_count)}
                </span>
                <span className={`rounded-full px-3 py-1 font-bold ${r.status === "done" ? "bg-go-soft" : "bg-sunken"}`}>
                  {BADGE[r.status]}
                </span>
              </span>
            </Link>
            <div className="flex items-center justify-between gap-2 px-[18px] pb-3 pt-1">
              <span className="text-[16px] text-ink2">{formatDays(r.days)}</span>
              {canEdit && (
                <Link href={`/routines/${r.id}/edit`} aria-label={`Edit ${r.title}`} className={`${br.link} flex items-center`}>
                  Edit
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
