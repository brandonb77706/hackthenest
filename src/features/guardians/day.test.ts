import { describe, expect, it } from "vitest";
import type { TodayRoutine } from "@/features/home/today";
import { dayFeed, dayProgress, statusLabel } from "./day";

const r = (id: string, title: string, status: TodayRoutine["status"], steps_done: number, step_count = 3): TodayRoutine => ({
  id,
  title,
  tone: "teal",
  start_time: "08:00",
  days: ["mon"],
  step_count,
  steps_done,
  status,
});

describe("dayProgress", () => {
  it("counts only routines that are on today", () => {
    expect(dayProgress([r("a", "A", "done", 3), r("b", "B", "next", 0), r("c", "C", "not_today", 0)])).toEqual({ done: 1, total: 2 });
  });
});

describe("dayFeed", () => {
  const routines = [r("a", "Morning routine", "done", 3), r("b", "Take medicine", "next", 1), r("c", "Bedtime", "later", 0)];
  const checkIns = [
    { routine_id: "a", time: "2026-11-15T14:05:00Z" },
    { routine_id: "a", time: "2026-11-15T14:31:00Z" },
    { routine_id: "b", time: "2026-11-15T18:10:00Z" },
  ];

  it("lists finished and started routines, newest first, in local time", () => {
    expect(dayFeed(routines, checkIns, "America/Chicago")).toEqual([
      { time: "12:10", title: "Working on Take medicine", sub: "1 of 3 steps done" },
      { time: "08:31", title: "Finished Morning routine", sub: "3 of 3 steps" },
    ]);
  });

  it("is empty when nothing was checked off", () => {
    expect(dayFeed(routines, [], "UTC")).toEqual([]);
  });
});

it("statusLabel uses plain words", () => {
  expect(statusLabel(r("a", "A", "done", 3))).toBe("Done today");
  expect(statusLabel(r("a", "A", "next", 0))).toBe("Up next");
  expect(statusLabel(r("a", "A", "next", 2))).toBe("2 of 3 done");
  expect(statusLabel(r("a", "A", "later", 0))).toBe("Later today");
  expect(statusLabel(r("a", "A", "not_today", 0))).toBe("Not today");
});

import { sharedList } from "./day";

it("sharedList says only what's turned on", () => {
  expect(sharedList({ can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false })).toEqual([]);
  expect(sharedList({ can_see_routines: true, can_get_lost_alerts: true, can_get_stuck_alerts: false })).toEqual([
    "Their routines and when they finish one",
    "Their location, only when they tap I'm lost",
  ]);
});
