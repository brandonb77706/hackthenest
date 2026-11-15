"use client";

import { ChallengesCard } from "@/features/rewards/components/ChallengesCard";
import Link from "next/link";
import { CoinIcon, FlameIcon, Icon } from "@/components/bridge/Icon";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { br } from "@/components/bridge/styles";
import { formatStepCount, formatTime } from "@/features/routine-builder/format";
import { greeting } from "@/lib/time";
import { routineIcon } from "../routineIcon";
import type { TodayRoutine } from "../today";
import { useToday } from "../useToday";

const chip =
  "flex items-center gap-1.5 rounded-full bg-chip px-3.5 py-1.5 font-display text-[18px] font-bold text-chip-ink shadow-[0_3px_0_var(--br-hero-edge)]";

/** The Today tab: greeting, progress, and today's routines as a path. */
export function TodayScreen() {
  const { today, loading, error, hour } = useToday();
  // A guardian can turn off making routines. Doing them is never limited.
  const canMakeRoutines = today?.edit?.routines.allowed !== false;
  const todays = today?.routines.filter((r) => r.status !== "not_today") ?? [];
  const doneCount = todays.filter((r) => r.status === "done").length;
  const hello = hour === null ? "Hello" : greeting(hour);

  return (
    <div className="flex flex-col pb-[130px]">
      <header className="flex flex-col gap-3 rounded-b-[28px] bg-hero px-6 pb-6 pt-[22px] text-hero-ink shadow-[inset_0_-5px_0_var(--br-hero-edge)]">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[18px] font-bold">
            {today?.name ? `${hello}, ${today.name}` : hello}
          </p>
          <NotificationBell />
        </div>
        <h1 className="m-0 font-display text-[32px] font-bold leading-[1.05]">
          {loading
            ? "Loading your day…"
            : `${doneCount} of ${todays.length} done today`}
        </h1>
        {todays.length > 0 && (
          <div className="flex gap-2" aria-hidden="true">
            {todays.map((r) => (
              <span
                key={r.id}
                className={`h-2.5 flex-1 rounded-full ${r.status === "done" ? "bg-hero-ink" : "bg-[var(--br-seg-empty)]"}`}
              />
            ))}
          </div>
        )}
        <div className="mt-0.5 flex gap-2.5">
          <span className={chip}>
            <FlameIcon />
            {today?.streak ?? 0} {today?.streak === 1 ? "day" : "days"}
          </span>
          <span className={chip}>
            <CoinIcon />
            {today?.tokens ?? 0} tokens
          </span>
        </div>
      </header>

      <div className="flex flex-col items-center gap-[26px] px-4 pt-7">
        {error && (
          <p
            role="alert"
            className="m-0 w-full rounded-2xl bg-danger-soft px-5 py-4 font-bold text-danger-text"
          >
            {error}
          </p>
        )}

        {todays.map((r) => (
          <PathStop key={r.id} routine={r} />
        ))}

        {!loading &&
          !error &&
          todays.length > 0 &&
          doneCount === todays.length && (
            <p className="m-0 w-full rounded-2xl bg-go-soft px-5 py-4 text-center font-bold">
              Everything for today is done. Nice work.
            </p>
          )}
        {!loading && !error && todays.length === 0 && (
          <p className="m-0 w-full rounded-2xl bg-sunken px-5 py-4 text-center">
            {canMakeRoutines ? "Nothing is planned for today. Make a routine to get started." : "Nothing is planned for today."}
          </p>
        )}

        {today?.challenges && <ChallengesCard challenges={today.challenges} />}

        {canMakeRoutines && (
          <Link
            href="/routines/new"
            className={`${br.ghost} flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-[18px] no-underline`}
          >
            <Icon name="plus" size={22} strokeWidth={2.6} />
            Make a new routine
          </Link>
        )}
      </div>
    </div>
  );
}

function PathStop({ routine: r }: { routine: TodayRoutine }) {
  const icon = routineIcon(r.start_time);
  const time = formatTime(r.start_time);

  if (r.status === "done") {
    return (
      <div
        className={`tone-${r.tone} flex w-full flex-col items-center gap-2.5`}
      >
        <span className="flex size-[88px] items-center justify-center rounded-full bg-tone text-tone-ink shadow-[0_6px_0_var(--t-edge)]">
          <Icon name="check" size={40} strokeWidth={3} />
        </span>
        <span className="mt-1 flex flex-col items-center">
          <span className="font-display text-[20px] font-bold">{r.title}</span>
          <span className="text-[17px] text-ink2">Done</span>
        </span>
      </div>
    );
  }

  if (r.status === "later") {
    return (
      <div className="flex w-full flex-col items-center gap-2.5">
        <Link
          href={`/play/${r.id}`}
          aria-label={`Start ${r.title}`}
          className="flex size-[88px] items-center justify-center rounded-full border-[3px] border-line bg-sunken text-ink2"
        >
          <Icon name={icon} size={38} />
        </Link>
        <span className="mt-1 flex flex-col items-center">
          <span className="font-display text-[20px] font-bold">{r.title}</span>
          <span className="text-[17px] text-ink2">{time}</span>
        </span>
      </div>
    );
  }

  // Next: the big one, with a Start button.
  return (
    <div className={`tone-${r.tone} flex w-full flex-col items-center gap-2.5`}>
      <span
        aria-hidden="true"
        className="flex size-[120px] items-center justify-center rounded-full bg-tone-soft"
      >
        <span className="flex size-[104px] items-center justify-center rounded-full bg-tone text-tone-ink shadow-[0_6px_0_var(--t-edge)]">
          <Icon name={icon} size={46} />
        </span>
      </span>
      <div className="relative mt-1.5 box-border flex w-full flex-col gap-1 rounded-3xl bg-tone px-[22px] pb-[22px] pt-5 text-tone-ink shadow-[0_5px_0_var(--t-edge)]">
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[-9px] -ml-[9px] size-[18px] rotate-45 bg-tone"
        />
        <span className="flex items-center gap-1.5 font-display text-[19px] font-semibold">
          <Icon name="clock" size={18} strokeWidth={2.4} />
          {time}
        </span>
        <h2 className="m-0 font-display text-[27px] font-bold leading-[1.15]">
          {r.title}
        </h2>
        <span className="text-[18px] font-bold">
          {r.steps_done > 0
            ? `${r.steps_done} of ${formatStepCount(r.step_count)} done`
            : formatStepCount(r.step_count)}
        </span>
        <Link
          href={
            r.steps_done > 0
              ? `/play/${r.id}?step=${r.steps_done + 1}`
              : `/play/${r.id}`
          }
          aria-label={`${r.steps_done > 0 ? "Keep going" : "Start"} ${r.title}`}
          className="br-press mt-3 flex h-[58px] items-center justify-center rounded-2xl border-2 border-tone-edge bg-start font-display text-[21px] font-bold text-start-ink no-underline shadow-[0_5px_0_var(--t-edge)]"
        >
          {r.steps_done > 0 ? "Keep going" : "Start"}
        </Link>
      </div>
    </div>
  );
}
