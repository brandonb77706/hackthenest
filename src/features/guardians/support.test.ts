// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const findCheckIns = vi.fn();
const findAdded = vi.fn<(q?: unknown) => Promise<{ _id: string }[]>>(async () => []);
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => {}),
  GuardianLinkModel: { findOne: (q: unknown) => findOne(q) },
  CheckInModel: { find: (q: unknown) => findCheckIns(q) },
  RoutineModel: { find: (q: unknown) => findAdded(q) },
  toRecord: (doc: unknown) => doc,
}));
const getToday = vi.fn();
vi.mock("@/features/home/service", () => ({ getToday: (...a: unknown[]) => getToday(...a) }));
const createContact = vi.fn();
const listContacts = vi.fn();
const updateContact = vi.fn();
const deleteContact = vi.fn();
vi.mock("@/features/help/service", () => ({
  createContact: (...a: unknown[]) => createContact(...a),
  listContacts: (...a: unknown[]) => listContacts(...a),
  updateContact: (...a: unknown[]) => updateContact(...a),
  deleteContact: (...a: unknown[]) => deleteContact(...a),
}));
const createRoutine = vi.fn();
const getRoutine = vi.fn();
const updateRoutine = vi.fn();
const deleteRoutine = vi.fn();
vi.mock("@/features/routine-builder/service", () => ({
  createRoutine: (...a: unknown[]) => createRoutine(...a),
  getRoutine: (...a: unknown[]) => getRoutine(...a),
  updateRoutine: (...a: unknown[]) => updateRoutine(...a),
  deleteRoutine: (...a: unknown[]) => deleteRoutine(...a),
}));

import {
  addContactFor,
  addRoutineFor,
  deleteContactFor,
  deleteRoutineFor,
  getPersonDay,
  getRoutineFor,
  listContactsFor,
  updateContactFor,
  updateRoutineFor,
} from "./support";

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
      added: [],
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
    expect(createContact).toHaveBeenCalledWith(
      JORDAN,
      { ...contact, can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false },
      sam.id,
    );
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
    expect(createRoutine).toHaveBeenCalledWith(JORDAN, input, sam.id);
  });
});

describe("what a guardian can change", () => {
  const routine = (added_by: string | null) => ({ id: "r1", user_id: JORDAN, added_by, title: "Morning", steps: [] });
  const input = { title: "Morning", goal: "", days: ["mon" as const], start_time: "08:00", steps: [{ text: "Wake", minutes: 2 }], tone: "teal" as const, remind: true };

  it("still sees the routines they added when routines aren't shared", async () => {
    findOne.mockResolvedValue(link());
    findAdded.mockResolvedValueOnce([{ _id: "r1" }]);
    const day = await getPersonDay(sam, JORDAN, "UTC");
    expect(day?.routines).toBeNull();
    expect(day?.added.map((r) => r.id)).toEqual(["r1"]);
    expect(findAdded).toHaveBeenCalledWith({ user_id: JORDAN, added_by: sam.id });
  });

  it("changes any routine when routines are shared", async () => {
    findOne.mockResolvedValue(link({ can_see_routines: true }));
    getRoutine.mockResolvedValue(routine(null));
    updateRoutine.mockResolvedValue({ id: "r1" });
    expect(await updateRoutineFor(sam, JORDAN, "r1", input)).toBe(true);
    expect(updateRoutine).toHaveBeenCalledWith(JORDAN, "r1", input);
  });

  it("changes only their own routines when routines aren't shared", async () => {
    findOne.mockResolvedValue(link());
    getRoutine.mockResolvedValue(routine(null));
    expect(await getRoutineFor(sam, JORDAN, "r1")).toBeNull();
    expect(await deleteRoutineFor(sam, JORDAN, "r1")).toBe(false);
    expect(deleteRoutine).not.toHaveBeenCalled();
    getRoutine.mockResolvedValue(routine(sam.id));
    deleteRoutine.mockResolvedValue(true);
    expect(await deleteRoutineFor(sam, JORDAN, "r1")).toBe(true);
  });

  it("changes nothing for someone they aren't linked to", async () => {
    findOne.mockResolvedValue(null);
    expect(await updateRoutineFor(sam, JORDAN, "r1", input)).toBe(false);
    expect(await listContactsFor(sam, JORDAN)).toBeNull();
    expect(getRoutine).not.toHaveBeenCalled();
  });

  const c = (id: string, added_by: string | null) => ({
    id,
    user_id: JORDAN,
    name: "Maria",
    method: "sms" as const,
    contact: "5550100",
    relation: "Aunt",
    can_see_routines: false,
    can_get_lost_alerts: true,
    can_get_stuck_alerts: false,
    added_by,
  });

  it("sees and changes only the contacts they added, keeping the person's sharing", async () => {
    findOne.mockResolvedValue(link());
    listContacts.mockResolvedValue([c("mine", sam.id), c("jordans", null)]);
    expect((await listContactsFor(sam, JORDAN))?.map((x) => x.id)).toEqual(["mine"]);

    updateContact.mockResolvedValue({ id: "mine" });
    const edit = { name: "Maria", method: "sms" as const, contact: "5550199", relation: "Aunt", can_see_routines: true, can_get_lost_alerts: false, can_get_stuck_alerts: true };
    expect(await updateContactFor(sam, JORDAN, "mine", edit)).toBe(true);
    expect(updateContact).toHaveBeenCalledWith(JORDAN, "mine", { ...edit, can_see_routines: false, can_get_lost_alerts: true, can_get_stuck_alerts: false });

    expect(await updateContactFor(sam, JORDAN, "jordans", edit)).toBe(false);
    expect(await deleteContactFor(sam, JORDAN, "jordans")).toBe(false);
    expect(deleteContact).not.toHaveBeenCalled();
  });
});
