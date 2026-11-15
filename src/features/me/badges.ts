// The badges from the design (Main.dc.html), worked out from what Bridge
// already saves: finished routines, routines the user made, their colors and
// Buddies. Nothing is stored, so badges can't be lost, and help never counts
// against anyone. When Nati's rewards save awarded badges, swap this for that.
// Plain functions, no database, so they are easy to test.

import type { IconName } from "@/components/bridge/Icon";
import type { RoutineTone, Weekday } from "@/lib/types";

export const BADGE_GROUPS = [
  { id: "routines", name: "Routines" },
  { id: "streaks", name: "Streaks" },
  { id: "skills", name: "Skills" },
  { id: "collection", name: "Collection" },
] as const;
export type BadgeGroup = (typeof BADGE_GROUPS)[number]["id"];

interface BadgeDef {
  id: string;
  group: BadgeGroup;
  name: string;
  desc: string;
  icon: IconName;
  tone: RoutineTone;
}

export const BADGES: BadgeDef[] = [
  { id: "first", group: "routines", name: "First step", desc: "Finish your first routine", icon: "star", tone: "teal" },
  { id: "early", group: "routines", name: "Early bird", desc: "Finish a morning routine 5 times", icon: "sun", tone: "gold" },
  { id: "pharmacy", group: "routines", name: "Pharmacy pro", desc: "Finish a pharmacy or prescription routine", icon: "pill", tone: "sea" },
  { id: "fullday", group: "routines", name: "Full day", desc: "Finish every routine in one day", icon: "trophy", tone: "gold" },
  { id: "nightowl", group: "routines", name: "Night owl", desc: "Finish an evening routine 5 times", icon: "moon", tone: "teal" },
  { id: "perfectweek", group: "routines", name: "Perfect week", desc: "Finish every routine for 7 days in a row", icon: "calendar", tone: "sea" },
  { id: "streak3", group: "streaks", name: "3-day streak", desc: "Finish a routine 3 days in a row", icon: "flame", tone: "orange" },
  { id: "streak7", group: "streaks", name: "7-day streak", desc: "Finish a routine 7 days in a row", icon: "flame", tone: "orange" },
  { id: "streak30", group: "streaks", name: "30-day streak", desc: "Finish a routine 30 days in a row", icon: "flame", tone: "gold" },
  { id: "maker", group: "skills", name: "Routine maker", desc: "Make your own routine", icon: "calendar", tone: "teal" },
  { id: "bill", group: "skills", name: "Bill helper", desc: "Scan a letter and walk through it", icon: "doc", tone: "teal" },
  { id: "speak", group: "skills", name: "Speak up", desc: "Use Speak for me to say something", icon: "chat", tone: "orange" },
  { id: "paperpro", group: "skills", name: "Paper pro", desc: "Scan 5 letters or forms", icon: "doc", tone: "sea" },
  { id: "tokens100", group: "collection", name: "100 coins", desc: "Earn 100 coins", icon: "coin", tone: "gold" },
  { id: "collector", group: "collection", name: "Buddy collector", desc: "Have 3 Buddies", icon: "people", tone: "teal" },
  { id: "colors", group: "collection", name: "Your colors", desc: "Pick a color scheme that suits you", icon: "palette", tone: "orange" },
];

export interface BadgeStatus extends BadgeDef {
  earned: boolean;
  /** "YYYY-MM-DD" when known, or null */
  earned_on: string | null;
  /** How to get it, or how close you are. Shown while it's locked */
  hint: string;
}

export interface BadgeFacts {
  routines: {
    id: string;
    title: string;
    start_time: string;
    days: Weekday[];
    active: boolean;
    step_ids: string[];
    /** A guardian who added it, or null if the user made it */
    added_by: string | null;
    /** "YYYY-MM-DD" */
    created_on: string;
  }[];
  /** Steps finished, each with its "YYYY-MM-DD" in the user's day */
  done: { routine_id: string; step_id: string; date: string }[];
  /** True when the user picked something other than the default scheme */
  pickedColors: boolean;
  tokens: number;
  /** "YYYY-MM-DD" each Buddy was added, oldest first */
  buddiesOn: string[];
}

const WEEKDAY_OF_DATE: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekday = (date: string): Weekday => WEEKDAY_OF_DATE[new Date(`${date}T12:00:00Z`).getUTCDay()];
const nextDay = (date: string) => new Date(new Date(`${date}T12:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10);

/** Each routine finished on each day: every step checked off that day. */
export function completions(facts: BadgeFacts): { routine_id: string; date: string }[] {
  const doneBy = new Map<string, Set<string>>();
  for (const d of facts.done) {
    const key = `${d.routine_id}|${d.date}`;
    doneBy.set(key, (doneBy.get(key) ?? new Set()).add(d.step_id));
  }
  const out: { routine_id: string; date: string }[] = [];
  for (const [key, steps] of doneBy) {
    const [routine_id, date] = key.split("|");
    const routine = facts.routines.find((r) => r.id === routine_id);
    if (routine && routine.step_ids.length > 0 && routine.step_ids.every((s) => steps.has(s))) out.push({ routine_id, date });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** The date the nth item happened, or null. Dates must be sorted. */
const nth = (dates: string[], n: number) => (dates.length >= n ? dates[n - 1] : null);

/** The day a run of consecutive days first reached `length`, and the longest run. */
function runs(dates: string[], length: number): { reachedOn: string | null; longest: number } {
  const days = [...new Set(dates)].sort();
  let run = 0;
  let longest = 0;
  let reachedOn: string | null = null;
  days.forEach((d, i) => {
    run = i > 0 && nextDay(days[i - 1]) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    if (run >= length && !reachedOn) reachedOn = d;
  });
  return { reachedOn, longest };
}

export function earnBadges(facts: BadgeFacts): BadgeStatus[] {
  const finished = completions(facts);
  const routineOf = (id: string) => facts.routines.find((r) => r.id === id);
  const finishedWhere = (test: (r: BadgeFacts["routines"][number]) => boolean) =>
    finished.filter((c) => {
      const r = routineOf(c.routine_id);
      return r ? test(r) : false;
    });

  const mornings = finishedWhere((r) => r.start_time < "12:00").map((c) => c.date);
  const evenings = finishedWhere((r) => r.start_time >= "17:00").map((c) => c.date);
  const pharmacy = finishedWhere((r) => /pharmacy|prescription/i.test(r.title)).map((c) => c.date);

  // A full day: every routine planned for that weekday was finished that day.
  const finishedOn = new Map<string, Set<string>>();
  for (const c of finished) finishedOn.set(c.date, (finishedOn.get(c.date) ?? new Set()).add(c.routine_id));
  const fullDays = [...finishedOn.entries()]
    .filter(([date, ids]) => {
      const planned = facts.routines.filter((r) => r.active && r.step_ids.length > 0 && r.days.includes(weekday(date)) && r.created_on <= date);
      return planned.length > 0 && planned.every((r) => ids.has(r.id));
    })
    .map(([date]) => date)
    .sort();

  const streakDays = finished.map((c) => c.date);
  const streak = (n: number) => runs(streakDays, n);
  const perfect = runs(fullDays, 7);
  const made = facts.routines.filter((r) => r.added_by === null).map((r) => r.created_on).sort();

  const result: Record<string, { on: string | null; earned: boolean; hint: string }> = {
    first: { on: nth(streakDays, 1), earned: finished.length > 0, hint: "Finish all the steps of a routine" },
    early: { on: nth(mornings, 5), earned: mornings.length >= 5, hint: `${Math.min(mornings.length, 5)} of 5 mornings` },
    pharmacy: { on: nth(pharmacy, 1), earned: pharmacy.length > 0, hint: "Finish a routine like Pick up prescription" },
    fullday: { on: nth(fullDays, 1), earned: fullDays.length > 0, hint: "Finish all of one day's routines" },
    nightowl: { on: nth(evenings, 5), earned: evenings.length >= 5, hint: `${Math.min(evenings.length, 5)} of 5 evenings` },
    perfectweek: { on: perfect.reachedOn, earned: perfect.reachedOn !== null, hint: `${Math.min(perfect.longest, 7)} of 7 full days` },
    streak3: { on: streak(3).reachedOn, earned: streak(3).reachedOn !== null, hint: `${Math.min(streak(3).longest, 3)} of 3 days` },
    streak7: { on: streak(7).reachedOn, earned: streak(7).reachedOn !== null, hint: `${Math.min(streak(7).longest, 7)} of 7 days` },
    streak30: { on: streak(30).reachedOn, earned: streak(30).reachedOn !== null, hint: `${Math.min(streak(30).longest, 30)} of 30 days` },
    maker: { on: nth(made, 1), earned: made.length > 0, hint: "Tap New on Routines" },
    bill: { on: null, earned: false, hint: "Scan a letter on Scan" },
    speak: { on: null, earned: false, hint: "Try Speak for me on Help" },
    paperpro: { on: null, earned: false, hint: "Scan 5 letters" },
    tokens100: { on: null, earned: facts.tokens >= 100, hint: `${Math.min(Math.max(facts.tokens, 0), 100)} of 100 coins` },
    collector: { on: nth(facts.buddiesOn, 3), earned: facts.buddiesOn.length >= 3, hint: `${Math.min(facts.buddiesOn.length, 3)} of 3 Buddies` },
    colors: { on: null, earned: facts.pickedColors, hint: "Me > Color scheme" },
  };

  return BADGES.map((b) => ({ ...b, earned: result[b.id].earned, earned_on: result[b.id].earned ? result[b.id].on : null, hint: result[b.id].hint }));
}

/** "3 of 16 badges" */
export function badgeCount(badges: BadgeStatus[]): string {
  return `${badges.filter((b) => b.earned).length} of ${badges.length} badges`;
}

/** Earned badges, newest first (undated ones last), for the preview on Me. */
export function recentBadges(badges: BadgeStatus[], max = 6): BadgeStatus[] {
  return badges
    .filter((b) => b.earned)
    .sort((a, b) => (b.earned_on ?? "").localeCompare(a.earned_on ?? ""))
    .slice(0, max);
}

/** "Earned Nov 12, 2026", "Earned", or "Not earned yet". */
export function earnedText(b: BadgeStatus): string {
  if (!b.earned) return "Not earned yet";
  if (!b.earned_on) return "Earned";
  const date = new Date(`${b.earned_on}T12:00:00Z`);
  return `Earned ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}
