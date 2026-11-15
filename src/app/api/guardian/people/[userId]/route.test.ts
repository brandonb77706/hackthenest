// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(async () => ({ id: "g1", role: "guardian" })) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/features/guardians/support", () => ({
  getPersonDay: vi.fn(),
  addRoutineFor: vi.fn(),
  addContactFor: vi.fn(),
  listContactsFor: vi.fn(),
  updateRoutineFor: vi.fn(),
  deleteRoutineFor: vi.fn(),
  updateContactFor: vi.fn(),
  deleteContactFor: vi.fn(),
}));

import * as support from "@/features/guardians/support";
import { DELETE as deleteContact, PATCH as patchContact } from "./contacts/[contactId]/route";
import { GET as listContacts, POST as addContact } from "./contacts/route";
import { DELETE as deleteRoutine, PATCH as patchRoutine } from "./routines/[routineId]/route";
import { GET as day } from "./day/route";
import { POST as addRoutine } from "./routines/route";

const s = vi.mocked(support);
const ctx = { params: Promise.resolve({ userId: "u1" }) };
const post = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("guardian routes", () => {
  it("GET day passes the time zone and 404s when not linked", async () => {
    s.getPersonDay.mockResolvedValueOnce(null);
    expect((await day(new Request("http://test?tz=America/Chicago"), ctx)).status).toBe(404);
    expect(s.getPersonDay).toHaveBeenCalledWith({ id: "g1", role: "guardian" }, "u1", "America/Chicago");
  });

  it("POST routines checks the routine like the builder does", async () => {
    const bad = await addRoutine(post({ title: "", days: ["mon"], start_time: "08:00", steps: [] }), ctx);
    expect(bad.status).toBe(400);
    expect(s.addRoutineFor).not.toHaveBeenCalled();

    s.addRoutineFor.mockResolvedValue("r1");
    const ok = await addRoutine(post({ title: "Laundry", days: ["mon"], start_time: "17:00", steps: [{ text: "Sort", minutes: 5 }] }), ctx);
    expect(ok.status).toBe(201);
  });

  it("POST contacts checks the contact and 404s when not linked", async () => {
    expect((await addContact(post({ name: "", method: "sms", contact: "5" }), ctx)).status).toBe(400);
    s.addContactFor.mockResolvedValue(null);
    expect((await addContact(post({ name: "Maria", method: "sms", contact: "555 010 0100" }), ctx)).status).toBe(404);
  });
});

describe("guardian edit and delete routes", () => {
  const rctx = { params: Promise.resolve({ userId: "u1", routineId: "r1" }) };
  const cctx = { params: Promise.resolve({ userId: "u1", contactId: "c1" }) };
  const routine = { title: "Laundry", days: ["mon"], start_time: "17:00", steps: [{ text: "Sort", minutes: 5 }] };
  const contact = { name: "Maria", method: "sms", contact: "555 010 0100" };

  it("PATCH and DELETE a routine, 404 when the guardian can't change it", async () => {
    s.updateRoutineFor.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await patchRoutine(new Request("http://test", { method: "PATCH", body: JSON.stringify(routine) }), rctx)).status).toBe(200);
    expect((await patchRoutine(new Request("http://test", { method: "PATCH", body: JSON.stringify(routine) }), rctx)).status).toBe(404);
    expect((await patchRoutine(new Request("http://test", { method: "PATCH", body: JSON.stringify({ ...routine, title: "" }) }), rctx)).status).toBe(400);
    s.deleteRoutineFor.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await deleteRoutine(new Request("http://test"), rctx)).status).toBe(204);
    expect((await deleteRoutine(new Request("http://test"), rctx)).status).toBe(404);
  });

  it("GET, PATCH and DELETE contacts the guardian added", async () => {
    s.listContactsFor.mockResolvedValueOnce([]).mockResolvedValueOnce(null);
    expect(await (await listContacts(new Request("http://test"), ctx)).json()).toEqual({ contacts: [] });
    expect((await listContacts(new Request("http://test"), ctx)).status).toBe(404);
    s.updateContactFor.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await patchContact(new Request("http://test", { method: "PATCH", body: JSON.stringify(contact) }), cctx)).status).toBe(200);
    expect((await patchContact(new Request("http://test", { method: "PATCH", body: JSON.stringify(contact) }), cctx)).status).toBe(404);
    s.deleteContactFor.mockResolvedValueOnce(true);
    expect((await deleteContact(new Request("http://test"), cctx)).status).toBe(204);
  });
});
