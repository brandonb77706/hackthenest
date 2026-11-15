import { CoinIcon, Icon, type IconName } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import type { ChallengeStatus } from "../challenges";

const ICON: Record<ChallengeStatus["id"], IconName> = { all_routines: "trophy", scans: "scan", new_routine: "plus" };

/** Today's three challenges, with progress and what each pays. */
export function ChallengesCard({ challenges }: { challenges: ChallengeStatus[] }) {
  if (challenges.length === 0) return null;
  const done = challenges.filter((c) => c.done).length;
  return (
    <section aria-labelledby="challenges-title" className={`${br.card} flex w-full flex-col gap-3 rounded-[22px] p-4 text-left`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="challenges-title" className={`${br.h2} text-[21px]`}>
          Today&apos;s challenges
        </h2>
        <span className="text-[15px] font-bold text-ink2">
          {done} of {challenges.length} done
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {challenges.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex size-11 shrink-0 items-center justify-center rounded-full ${c.done ? "bg-go text-on-go" : "tone-gold bg-tone-soft text-ink"}`}
            >
              <Icon name={c.done ? "check" : ICON[c.id]} size={22} strokeWidth={2.4} />
            </span>
            <span className="flex min-w-0 grow flex-col gap-1">
              <span className="text-[17px] font-bold leading-tight">{c.title}</span>
              {c.done ? (
                <span className="text-[15px] text-ink2">Done today</span>
              ) : (
                <>
                  <span className="text-[15px] text-ink2">{c.progress}</span>
                  <span
                    role="progressbar"
                    aria-label={`${c.title}: ${c.progress}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={c.percent}
                    className="block h-2 overflow-hidden rounded-full bg-sunken"
                  >
                    <span className="block h-full rounded-full bg-switch-on" style={{ width: `${c.percent}%` }} />
                  </span>
                </>
              )}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[15px] font-bold ${c.done ? "bg-go-soft text-ink" : "bg-sunken text-ink"}`}
              aria-label={c.done ? `Earned ${c.tokens} tokens` : `Earns ${c.tokens} tokens`}
            >
              <CoinIcon size={16} />+{c.tokens}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
