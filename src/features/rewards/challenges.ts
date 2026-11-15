// Daily challenges: three a day, each paying once, more than a routine does.
// Plain functions, no database, so they are easy to test.

import type { ChallengeId } from "@/lib/types";

export const SCANS_GOAL = 3;

export const CHALLENGES: { id: ChallengeId; title: string; tokens: number }[] = [
  { id: "all_routines", title: "Finish all of today's routines", tokens: 50 },
  { id: "scans", title: `Scan ${SCANS_GOAL} letters or bills`, tokens: 40 },
  { id: "new_routine", title: "Make a new routine", tokens: 30 },
];

export interface ChallengeFacts {
  /** Routines planned for today (with steps) */
  routinesToday: number;
  /** Of those, how many are finished today */
  routinesDoneToday: number;
  scansToday: number;
  /** Routines the user made themselves today (not added by a guardian) */
  routinesMadeToday: number;
  /** False when a guardian manages routines: then the new-routine challenge is hidden */
  canMakeRoutines: boolean;
  /** Challenges already paid today */
  claimed: ChallengeId[];
}

export interface ChallengeStatus {
  id: ChallengeId;
  title: string;
  tokens: number;
  /** The goal is met today */
  done: boolean;
  /** "2 of 3 routines" */
  progress: string;
  /** 0 to 100 */
  percent: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (have: number, need: number) => (need <= 0 ? 0 : Math.min(100, Math.round((have / need) * 100)));

/** Today's challenges with progress. The new-routine one is left out when a guardian manages routines. */
export function challengeStatus(f: ChallengeFacts): ChallengeStatus[] {
  const claimed = new Set(f.claimed);
  return CHALLENGES.filter((c) => c.id !== "new_routine" || f.canMakeRoutines).map((c) => {
    if (c.id === "all_routines") {
      const done = claimed.has(c.id) || (f.routinesToday > 0 && f.routinesDoneToday >= f.routinesToday);
      return {
        ...c,
        done,
        progress: f.routinesToday === 0 ? "No routines planned today" : `${Math.min(f.routinesDoneToday, f.routinesToday)} of ${plural(f.routinesToday, "routine", "routines")}`,
        percent: done ? 100 : pct(f.routinesDoneToday, f.routinesToday),
      };
    }
    if (c.id === "scans") {
      const done = claimed.has(c.id) || f.scansToday >= SCANS_GOAL;
      return { ...c, done, progress: `${Math.min(f.scansToday, SCANS_GOAL)} of ${SCANS_GOAL} scans`, percent: done ? 100 : pct(f.scansToday, SCANS_GOAL) };
    }
    const done = claimed.has(c.id) || f.routinesMadeToday > 0;
    return { ...c, done, progress: done ? "Made one today" : "Not yet", percent: done ? 100 : 0 };
  });
}

/** Challenges met today that haven't been paid yet. */
export function readyToClaim(f: ChallengeFacts): ChallengeStatus[] {
  const claimed = new Set(f.claimed);
  return challengeStatus(f).filter((c) => c.done && !claimed.has(c.id));
}
