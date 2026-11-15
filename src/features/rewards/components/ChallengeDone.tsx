import { CoinIcon } from "@/components/bridge/Icon";
import type { ChallengeStatus } from "../challenges";

/** "Challenge done! Finish all of today's routines. +50 tokens", for each challenge just paid. */
export function ChallengeDone({ challenges }: { challenges: Pick<ChallengeStatus, "id" | "title" | "tokens">[] }) {
  if (challenges.length === 0) return null;
  return (
    <div role="status" className="flex w-full flex-col gap-2">
      {challenges.map((c) => (
        <p key={c.id} className="tone-gold m-0 flex items-center gap-3 rounded-2xl border-2 border-tone-edge bg-tone-soft px-4 py-3 text-left text-[17px] text-ink">
          <CoinIcon size={28} />
          <span>
            <strong>Challenge done!</strong> {c.title}. +{c.tokens} tokens
          </span>
        </p>
      ))}
    </div>
  );
}
