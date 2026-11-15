"use client";

import { useState } from "react";
import { CoinIcon } from "@/components/bridge/Icon";
import type { ChallengeStatus } from "../challenges";

/** "Challenge done! Finish all of today's routines. +50 tokens", for each challenge just paid. */
export function ChallengeDone({ challenges, showPopup = true }: { challenges: Pick<ChallengeStatus, "id" | "title" | "tokens">[]; showPopup?: boolean }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (challenges.length === 0) return null;
  const pending = challenges.filter((c) => !dismissed.includes(c.id));
  return (
    <div className="flex w-full flex-col gap-2">
      {showPopup && pending.length > 0 && <div className="tone-gold fixed inset-x-4 top-5 z-50 mx-auto max-w-[448px] rounded-2xl border-2 border-tone-edge bg-surface p-4 text-left text-ink shadow-xl" role="status" aria-live="polite">
        {pending.map((c) => <p key={c.id} className="my-1 text-[18px]"><strong>Challenge booster!</strong> {c.title}: +{c.tokens} {c.tokens === 1 ? "coin" : "coins"}.</p>)}
        <button type="button" className="mt-3 min-h-12 rounded-xl border-2 border-line px-4 font-bold" onClick={() => setDismissed((current) => [...current, ...pending.map((c) => c.id)])}>Dismiss challenge notification</button>
      </div>}
      {challenges.map((c) => (
        <p key={c.id} className="tone-gold m-0 flex items-center gap-3 rounded-2xl border-2 border-tone-edge bg-tone-soft px-4 py-3 text-left text-[17px] text-ink">
          <CoinIcon size={28} />
          <span>
            <strong>Challenge done!</strong> {c.title}. +{c.tokens} coins
          </span>
        </p>
      ))}
    </div>
  );
}
