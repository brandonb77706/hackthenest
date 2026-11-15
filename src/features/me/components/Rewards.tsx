"use client";

// "Badges and rewards" from the design: a card on Me with the newest badges,
// and a screen with tokens, the next reward, and every badge by group.
// Tapping a badge shows when it was earned, or how to get it.

import { useState } from "react";
import { Dialog } from "@/components/bridge/Dialog";
import { CoinIcon, Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { BADGE_GROUPS, badgeCount, earnedText, recentBadges, type BadgeStatus } from "../badges";
import { formatTokens, type NextReward } from "../summary";

/** A badge's round icon: its color when earned, a lock when not. */
export function BadgeIcon({ badge, size = 64 }: { badge: BadgeStatus; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full ${
        badge.earned ? `tone-${badge.tone} bg-tone text-tone-ink shadow-[0_4px_0_var(--t-edge)]` : "bg-sunken text-ink2"
      }`}
      style={{ width: size, height: size }}
    >
      <Icon name={badge.earned ? badge.icon : "lock"} size={Math.round(size * 0.47)} strokeWidth={2.2} />
    </span>
  );
}

/** The card on Me. Opens the full screen. */
export function BadgesCard({ badges, nextReward, onOpen }: { badges: BadgeStatus[]; nextReward: NextReward | null; onOpen: () => void }) {
  const recent = recentBadges(badges);
  const count = badgeCount(badges);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Badges and rewards. ${count}.${nextReward ? ` ${nextReward.label}.` : ""} See all.`}
      className={`${br.ghost} flex flex-col gap-2.5 rounded-[22px] p-4 text-left`}
    >
      <span className="flex w-full items-center justify-between">
        <span className="font-display text-[21px] font-bold">Badges and rewards</span>
        <span className="text-[15px] font-bold text-primary-text">See all</span>
      </span>
      {recent.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          {recent.map((b) => (
            <BadgeIcon key={b.id} badge={b} size={46} />
          ))}
        </span>
      ) : (
        <span className="text-[16px] font-normal">Finish a routine to earn your first badge.</span>
      )}
      <span className="text-[15px] font-normal text-ink2">
        {count}
        {nextReward ? ` · ${nextReward.label}` : ""}
      </span>
    </button>
  );
}

/** The full screen: tokens, next reward, and every badge. */
/** A label, a progress bar, and a line under it: the next reward and the streak. */
function ProgressCard({ id, progress, icon }: { id: string; progress: NextReward; icon?: "flame" }) {
  return (
    <div className={`${br.card} flex flex-col gap-2 rounded-[20px] p-4`}>
      <span id={id} className="flex items-center gap-2 font-display text-[18px] font-semibold">
        {icon && <Icon name={icon} size={22} strokeWidth={2.2} className="text-danger" />}
        {progress.label}
      </span>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-3 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-switch-on" style={{ width: `${progress.percent}%` }} />
      </div>
      <span className="text-[15px] text-ink2">{progress.detail}</span>
    </div>
  );
}

export function RewardsView({
  tokens,
  nextReward,
  badges,
  streak,
}: {
  tokens: number;
  nextReward: NextReward | null;
  badges: BadgeStatus[];
  /** The streak and the next streak reward */
  streak?: NextReward;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = badges.find((b) => b.id === openId);

  return (
    <>
      <div className="flex items-center gap-3.5 rounded-[22px] bg-primary-soft p-[18px]">
        <CoinIcon size={54} />
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <span className="font-display text-[30px] font-bold leading-none">{formatTokens(tokens)}</span>
          <span className="text-[15px] text-ink2">You earn tokens when you finish steps and routines.</span>
        </div>
      </div>
      {nextReward && <ProgressCard id="next-reward-label" progress={nextReward} />}
      {streak && <ProgressCard id="streak-label" progress={streak} icon="flame" />}

      <h2 className={`${br.h2} mt-1.5 text-[22px]`}>Badges · {badgeCount(badges)}</h2>
      <p className="m-0 -mt-1.5 text-[16px] text-ink2">Tap a badge to see when you earned it.</p>
      {BADGE_GROUPS.map((g) => {
        const list = badges.filter((b) => b.group === g.id);
        const got = list.filter((b) => b.earned).length;
        return (
          <section key={g.id} aria-labelledby={`badges-${g.id}`} className="mt-1.5 flex flex-col gap-2.5">
            <h3 id={`badges-${g.id}`} className="m-0 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-ink2">
              {g.name} · {got} of {list.length}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {list.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setOpenId(b.id)}
                  aria-haspopup="dialog"
                  aria-label={`${b.name}, ${b.earned ? earnedText(b).toLowerCase() : `locked. ${b.hint}`}`}
                  className={`br-press flex flex-col items-center gap-1.5 rounded-[20px] px-2.5 py-4 text-center text-ink ${
                    b.earned ? "border-2 border-line bg-surface" : "border-2 border-dashed border-line bg-canvas"
                  }`}
                >
                  <BadgeIcon badge={b} />
                  <span className="font-display text-[17px] font-bold leading-tight">{b.name}</span>
                  <span className="text-[14px] leading-snug text-ink2">{b.desc}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${b.earned ? "bg-go-soft" : "bg-sunken"}`}>
                    {b.earned ? "Earned" : b.hint}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {open && (
        <Dialog title={open.name} onClose={() => setOpenId(null)}>
          <div className="flex items-start gap-3.5">
            <BadgeIcon badge={open} size={72} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[16px] font-bold">
                <Icon name="calendar" size={18} strokeWidth={2.2} />
                {earnedText(open)}
              </span>
              <span className="text-[16px] text-ink2">{open.desc}.</span>
              {!open.earned && (
                <span className="text-[16px]">
                  {/^\d+ of /.test(open.hint) ? "So far" : "Tip"}: {open.hint}.
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setOpenId(null)} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
            Done
          </button>
        </Dialog>
      )}
    </>
  );
}
