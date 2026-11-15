// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const findCheckIns = vi.fn();
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => {}),
  GuardianLinkModel: { findOne: (q: unknown) => findOne(q) },
  CheckInModel: { find: (q: unknown) => findCheckIns(q) },
  toRecord: (doc: unknown) => doc,
}));
const getToday = vi.fn();
vi.mock("@/features/home/service", () => ({ getToday: (...a: unknown[]) => getToday(...a) }));
const createContact = vi.fn();
vi.mock("@/features/help/service", () => ({ createContact: (...a: unknown[]) => createContact(...a) }));
const createRoutine = vi.fn();
vi.mock("@/features/routine-builder/service", () => ({ createRoutine: (...a: unknown[]) => createRoutine(...a) }));

import { addContactFor, addRoutineFor, getPersonDay } from "./support";

const JORDAN = "64b000000000000000000001";
const sam = { id: "64b000000000000000000002", name: "Sam", email: "s@x.com", role: "guardian" as const };
const link = (shares: Partial<Record<"can_see_routines" | "can_get_lost_alerts" | "can_get_stuck_alerts", boolean>> = {}) => ({
  id: "l1",
  user_id: JORDAN,
  guardian_id: sam.id,
  can_see_routines: false,
  can_get_lost_alerts: false,
  can_get_stuck_alerts: false,
  ...shares,
});
const today = {
  name: "Jordan",
  streak: 4,
  tokens: 30,
  settings: {},
  routines: [{ id: "r1", title: "Morning", tone: "teal", start_time: "08:00", days: ["sun"], step_count: 1, steps_done: 1, status: "done" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  getToday.mockResolvedValue(today);
  findCheckIns.mockResolvedValue([{ routine_id: "r1", time: "2026-11-15T14:00:00.000Z", step_id: "s1", status: "done" }]);
});

describe("getPersonDay", () => {
  it("is null when the guardian isn't linked", async () => {
    findOne.mockResolvedValue(null);
    expect(await getPersonDay(sam, JORDAN, "UTC")).toBeNull();
    expect(getToday).not.toHaveBeenCalled();
  });

  it("only checks links for this guardian", async () => {
    findOne.mockResolvedValue(null);
    await getPersonDay(sam, JORDAN, "UTC");
    expect(findOne).toHaveBeenCalledWith({ guardian_id: sam.id, user_id: JORDAN });
  });

  it("refuses accounts that aren't guardians", async () => {
    expect(await getPersonDay({ ...sam, role: "user" }, JORDAN, "UTC")).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("hides routines, streak and tokens when routines aren't shared", async () => {
    findOne.mockResolvedValue(link());
    const day = await getPersonDay(sam, JORDAN, "UTC");
    expect(day).toEqual({
      name: "Jordan",
      shares: { can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false },
      routines: null,
      feed: null,
      streak: null,
      tokens: null,
    });
    expect(findCheckIns).not.toHaveBeenCalled();
  });

  it("shows the day when routines are shared", async () => {
    findOne.mockResolvedValue(link({ can_see_routines: true }));
    const day = await getPersonDay(sam, JORDAN, "UTC", new Date("2026-11-15T20:00:00Z"));
    expect(day?.routines).toHaveLength(1);
    expect(day?.feed).toEqual([{ time: "14:00", title: "Finished Morning", sub: "1 of 1 step" }]);
    expect(day).toMatchObject({ streak: 4, tokens: 30 });
  });
});

describe("helping add things", () => {
  const contact = {
    name: "Maria",
    method: "sms" as const,
    contact: "+15550100",
    relation: "Aunt",
    can_see_routines: true,
    can_get_lost_alerts: true,
    can_get_stuck_alerts: true,
  };

  it("adds a contact with every sharing setting off, whatever was sent", async () => {
    findOne.mockResolvedValue(link());
    createContact.mockResolvedValue({ id: "c1" });
    expect(await addContactFor(sam, JORDAN, contact)).toBe("c1");
    expect(createContact).toHaveBeenCalledWith(JORDAN, {
      ...contact,
      can_see_routines: false,
      can_get_lost_alerts: false,
      can_get_stuck_alerts: false,
    });
  });

  it("adds nothing for someone the guardian isn't linked to", async () => {
    findOne.mockResolvedValue(null);
    expect(await addContactFor(sam, JORDAN, contact)).toBeNull();
    expect(await addRoutineFor(sam, JORDAN, { title: "X", goal: "", days: ["mon"], start_time: "08:00", steps: [], tone: "teal", remind: true })).toBeNull();
    expect(createContact).not.toHaveBeenCalled();
    expect(createRoutine).not.toHaveBeenCalled();
  });

  it("adds a routine to the person's account", async () => {
    findOne.mockResolvedValue(link());
    createRoutine.mockResolvedValue({ id: "r9" });
    const input = { title: "Laundry", goal: "", days: ["mon" as const], start_time: "17:00", steps: [{ text: "Sort", minutes: 5 }], tone: "teal" as const, remind: true };
    expect(await addRoutineFor(sam, JORDAN, input)).toBe("r9");
    expect(createRoutine).toHaveBeenCalledWith(JORDAN, input);
  });
});
