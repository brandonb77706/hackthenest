import { describe, expect, it } from "vitest";
import { checkedInToday, dueRoutineReminders, routineOccurrence } from "./routineReminders";

const routine = { id: "r1", title: "Morning routine", days: ["sat" as const], start_time: "08:00", active: true };
describe("Eastern routine reminders", () => {
  it("converts the routine wall time using Eastern daylight time", () => {
    expect(routineOccurrence(routine, new Date("2026-11-14T13:50:00Z"))?.startAt).toBe(Date.parse("2026-11-14T13:00:00Z"));
  });
  it("converts the routine wall time using Eastern standard time", () => {
    expect(routineOccurrence(routine, new Date("2026-01-10T13:50:00Z"))?.startAt).toBe(Date.parse("2026-01-10T13:00:00Z"));
  });
  it("only schedules selected weekdays and active routines", () => {
    expect(routineOccurrence(routine, new Date("2026-11-13T12:00:00Z"))).toBeNull();
    expect(routineOccurrence({ ...routine, active: false }, new Date("2026-11-14T12:00:00Z"))).toBeNull();
  });
  it("fires ten minutes before within the polling grace window once", () => {
    const due = dueRoutineReminders([routine], new Set(), new Date("2026-11-14T12:50:30Z"));
    expect(due[0]).toMatchObject({ id: "r1:2026-11-14:0800:before", stage: "before", title: routine.title });
    expect(dueRoutineReminders([routine], new Set(), new Date("2026-11-14T12:50:30Z"), new Set([due[0].id]))).toEqual([]);
  });
  it("fires the late reminder ten minutes after start only if no check-in exists", () => {
    const now = new Date("2026-11-14T13:10:30Z");
    expect(dueRoutineReminders([routine], new Set(), now)[0]).toMatchObject({ stage: "late", id: "r1:2026-11-14:0800:late" });
    expect(dueRoutineReminders([routine], new Set(["r1"]), now)).toEqual([]);
  });
  it("does not send late or delayed reminders outside the two-minute grace", () => {
    expect(dueRoutineReminders([routine], new Set(), new Date("2026-11-14T13:12:01Z"))).toEqual([]);
    expect(dueRoutineReminders([routine], new Set(["r1"]), new Date("2026-11-14T12:50:30Z"))[0].stage).toBe("before");
  });
  it("counts any check-in status on the Eastern day, including across UTC midnight", () => {
    expect(checkedInToday([{ routine_id: "r1", time: "2026-11-15T04:30:00Z" }], "2026-11-14")).toEqual(new Set(["r1"]));
    expect(checkedInToday([{ routine_id: "r1", time: "2026-11-15T05:30:00Z" }], "2026-11-14")).toEqual(new Set());
  });
  it("uses an edited routine's new time and days, even after the old reminder was delivered", () => {
    const delivered = new Set(["r1:2026-11-14:0800:before"]);
    const updated = { ...routine, start_time: "09:00", days: ["sat" as const] };
    expect(dueRoutineReminders([updated], new Set(), new Date("2026-11-14T12:50:30Z"), delivered)).toEqual([]);
    expect(dueRoutineReminders([updated], new Set(), new Date("2026-11-14T13:50:30Z"), delivered)[0]).toMatchObject({ id: "r1:2026-11-14:0900:before" });
    expect(dueRoutineReminders([{ ...updated, days: ["mon"] }], new Set(), new Date("2026-11-14T13:50:30Z"), delivered)).toEqual([]);
  });
});
