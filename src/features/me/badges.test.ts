import { describe, expect, it } from "vitest";
import { BADGES, badgeCount, completions, earnBadges, earnedText, recentBadges, type BadgeFacts } from "./badges";

const EVERY_DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const routine = (id: string, over: Partial<BadgeFacts["routines"][number]> = {}): BadgeFacts["routines"][number] => ({
  id,
  title: id,
  start_time: "08:00",
  days: [...EVERY_DAY],
  active: true,
  step_ids: [`${id}-1`, `${id}-2`],
  added_by: "guardian",
  created_on: "2026-11-01",
  ...over,
});
/** Both steps of a routine checked off on a date */
const finish = (id: string, date: string) => [
  { routine_id: id, step_id: `${id}-1`, date },
  { routine_id: id, step_id: `${id}-2`, date },
];
const facts = (over: Partial<BadgeFacts> = {}): BadgeFacts => ({
  routines: [],
  done: [],
  pickedColors: false,
  tokens: 0,
  buddiesOn: [],
  ...over,
});
const status = (f: BadgeFacts, id: string) => earnBadges(f).find((b) => b.id === id)!;
const days = (start: number, n: number) =>
  Array.from({ length: n }, (_, i) => `2026-11-${String(start + i).padStart(2, "0")}`);

describe("completions", () => {
  it("counts a routine only when every step was done the same day", () => {
    const f = facts({
      routines: [routine("a")],
      done: [{ routine_id: "a", step_id: "a-1", date: "2026-11-02" }, { routine_id: "a", step_id: "a-2", date: "2026-11-03" }, ...finish("a", "2026-11-04")],
    });
    expect(completions(f)).toEqual([{ routine_id: "a", date: "2026-11-04" }]);
  });
});

describe("earnBadges", () => {
  it("starts with nothing earned and a hint for each", () => {
    const all = earnBadges(facts());
    expect(all).toHaveLength(BADGES.length);
    expect(all.every((b) => !b.earned && b.earned_on === null && b.hint)).toBe(true);
    expect(badgeCount(all)).toBe("0 of 16 badges");
  });

  it("First step on the day the first routine is finished", () => {
    const f = facts({ routines: [routine("a")], done: [...finish("a", "2026-11-05"), ...finish("a", "2026-11-03")] });
    expect(status(f, "first")).toMatchObject({ earned: true, earned_on: "2026-11-03" });
  });

  it("Early bird after 5 mornings, with progress before that", () => {
    const four = facts({ routines: [routine("m")], done: days(2, 4).flatMap((d) => finish("m", d)) });
    expect(status(four, "early")).toMatchObject({ earned: false, hint: "4 of 5 mornings" });
    const five = facts({ routines: [routine("m")], done: days(2, 5).flatMap((d) => finish("m", d)) });
    expect(status(five, "early")).toMatchObject({ earned: true, earned_on: "2026-11-06" });
    expect(status(five, "nightowl").earned).toBe(false);
  });

  it("Night owl for evening routines, Pharmacy pro by name", () => {
    const f = facts({
      routines: [routine("e", { start_time: "21:00" }), routine("p", { title: "Pick up prescription", start_time: "14:00" })],
      done: [...days(2, 5).flatMap((d) => finish("e", d)), ...finish("p", "2026-11-04")],
    });
    expect(status(f, "nightowl")).toMatchObject({ earned: true, earned_on: "2026-11-06" });
    expect(status(f, "pharmacy")).toMatchObject({ earned: true, earned_on: "2026-11-04" });
  });

  it("streaks need days in a row", () => {
    const gap = facts({ routines: [routine("a")], done: ["2026-11-02", "2026-11-03", "2026-11-05"].flatMap((d) => finish("a", d)) });
    expect(status(gap, "streak3")).toMatchObject({ earned: false, hint: "2 of 3 days" });
    const row = facts({ routines: [routine("a")], done: days(2, 7).flatMap((d) => finish("a", d)) });
    expect(status(row, "streak3")).toMatchObject({ earned: true, earned_on: "2026-11-04" });
    expect(status(row, "streak7")).toMatchObject({ earned: true, earned_on: "2026-11-08" });
    expect(status(row, "streak30")).toMatchObject({ earned: false, hint: "7 of 30 days" });
  });

  it("Full day needs every routine planned that day; Perfect week needs 7 in a row", () => {
    const two = [routine("a"), routine("b", { start_time: "20:00" })];
    const half = facts({ routines: two, done: finish("a", "2026-11-02") });
    expect(status(half, "fullday").earned).toBe(false);
    const full = facts({ routines: two, done: [...finish("a", "2026-11-02"), ...finish("b", "2026-11-02")] });
    expect(status(full, "fullday")).toMatchObject({ earned: true, earned_on: "2026-11-02" });

    const week = facts({ routines: two, done: days(2, 7).flatMap((d) => [...finish("a", d), ...finish("b", d)]) });
    expect(status(week, "perfectweek")).toMatchObject({ earned: true, earned_on: "2026-11-08" });
  });

  it("a routine not planned that weekday doesn't block a full day", () => {
    const f = facts({ routines: [routine("a"), routine("weekend", { days: ["sat", "sun"] })], done: finish("a", "2026-11-02") });
    expect(status(f, "fullday").earned).toBe(true);
  });

  it("Routine maker only for routines the user made, not ones a guardian added", () => {
    expect(status(facts({ routines: [routine("a")] }), "maker").earned).toBe(false);
    expect(status(facts({ routines: [routine("a", { added_by: null, created_on: "2026-11-09" })] }), "maker")).toMatchObject({
      earned: true,
      earned_on: "2026-11-09",
    });
  });

  it("collection badges from tokens, Buddies and colors", () => {
    const f = facts({ tokens: 120, buddiesOn: ["2026-11-01", "2026-11-03", "2026-11-07"], pickedColors: true });
    expect(status(f, "tokens100")).toMatchObject({ earned: true, earned_on: null });
    expect(status(f, "collector")).toMatchObject({ earned: true, earned_on: "2026-11-07" });
    expect(status(f, "colors").earned).toBe(true);
    expect(status(facts({ buddiesOn: ["2026-11-01"] }), "collector").hint).toBe("1 of 3 Buddies");
  });
});

describe("showing badges", () => {
  it("previews the newest earned badges, undated last", () => {
    const f = facts({ routines: [routine("a")], done: finish("a", "2026-11-03"), pickedColors: true });
    expect(recentBadges(earnBadges(f)).map((b) => b.id)).toEqual(["first", "fullday", "colors"]);
  });

  it("says when a badge was earned", () => {
    const [first] = earnBadges(facts({ routines: [routine("a")], done: finish("a", "2026-11-12") }));
    expect(earnedText(first)).toBe("Earned Nov 12, 2026");
    expect(earnedText({ ...first, earned_on: null })).toBe("Earned");
    expect(earnedText({ ...first, earned: false })).toBe("Not earned yet");
  });
});
