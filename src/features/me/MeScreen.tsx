// The Me screen from the design mockups: who you are, your tokens, your next reward.
// Shows only what Bridge can do today. Badges, levels, sharing switches, notification
// settings and color schemes are in the design but not built yet, so they aren't here.

import { BuddyAvatar } from "@/components/BuddyAvatar";
import { formatTokens, type MeSummary } from "./summary";

export function MeScreen({ summary }: { summary: MeSummary }) {
  const { name, tokens, buddyName, nextReward } = summary;
  const facts = [formatTokens(tokens), buddyName ? `Buddy: ${buddyName}` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-4">
        <span className="flex h-[84px] w-[84px] shrink-0 items-end justify-center overflow-hidden rounded-full border-[3px] border-(--br-cta) bg-(--br-primary-soft)">
          {buddyName && <BuddyAvatar name={buddyName} size={78} />}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="br-display m-0 text-[30px] leading-none font-bold break-words">{name || "Me"}</h1>
          <p className="m-0 text-[16px] text-(--br-ink2)">{facts}</p>
        </div>
      </div>

      <h2 className="br-display mt-2.5 mb-0 text-[22px] font-bold">Rewards</h2>

      <div className="flex items-center gap-3.5 rounded-[22px] bg-(--br-primary-soft) p-[18px]">
        <Coin />
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <span className="br-display text-[30px] leading-none font-bold">{formatTokens(tokens)}</span>
          <span className="text-[15px] text-(--br-ink2)">You earn tokens when you finish steps and routines.</span>
        </div>
      </div>

      {nextReward && (
        <div className="br-card flex flex-col gap-2 rounded-[20px] p-4">
          <span id="next-reward-label" className="br-display text-[18px] font-semibold">
            {nextReward.label}
          </span>
          <div
            role="progressbar"
            aria-labelledby="next-reward-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={nextReward.percent}
            className="h-3 overflow-hidden rounded-full bg-(--br-sunken)"
          >
            <div className="h-full rounded-full bg-(--br-bar)" style={{ width: `${nextReward.percent}%` }} />
          </div>
          <span className="text-[15px] text-(--br-ink2)">{nextReward.detail}</span>
        </div>
      )}
    </div>
  );
}

function Coin() {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="var(--br-coin)" stroke="var(--br-coin-edge)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--br-coin-edge)" strokeWidth="1.2" />
      <path
        d="M12 8.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"
        fill="var(--br-coin-edge)"
      />
    </svg>
  );
}
