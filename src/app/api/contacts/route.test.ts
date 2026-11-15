// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
const refuseIfLocked = vi.fn(async (): Promise<Response | null> => null);
vi.mock("@/features/guardians/service", () => ({ refuseIfLocked: (...a: unknown[]) => refuseIfLocked(...(a as [])) }));
const lockedReply = () => Response.json({ error: "Sam manages your trusted contacts. Ask Sam to make changes.", locked: true }, { status: 403 });
vi.mock("@/features/help/service", () => ({
  listContacts: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  listPhrases: vi.fn(),
  createPhrase: vi.fn(),
  deletePhrase: vi.fn(),
}));

import * as service from "@/features/help/service";
import { DELETE as DELETE_PHRASE } from "../phrases/[id]/route";
import { GET as GET_PHRASES, POST as POST_PHRASE } from "../phrases/route";
import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

const s = vi.mocked(service);
const json = (url: string, method: string, body: unknown) => new Request(`http://test${url}`, { method, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const sam = { name: "Sam", method: "sms", contact: "555-010-0142", relation: "Your brother" };

beforeEach(() => vi.clearAllMocks());

describe("/api/contacts", () => {
  it("lists the user's contacts", async () => {
    s.listContacts.mockResolvedValue([]);
    const res = await GET();
    expect(await res.json()).toEqual({ contacts: [] });
    expect(s.listContacts).toHaveBeenCalledWith("user-1");
  });

  it("adds a contact with every sharing setting off unless turned on", async () => {
    s.createContact.mockResolvedValue({ id: "c1" } as never);
    const res = await POST(json("/api/contacts", "POST", { ...sam, can_get_lost_alerts: true }));
    expect(res.status).toBe(201);
    expect(s.createContact).toHaveBeenCalledWith("user-1", {
      ...sam,
      contact: "5550100142",
      can_see_routines: false,
      can_get_lost_alerts: true,
      can_get_stuck_alerts: false,
    });
  });

  it("returns plain errors for a bad contact", async () => {
    const res = await POST(json("/api/contacts", "POST", { ...sam, name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).errors.name).toMatch(/name/);
    expect(s.createContact).not.toHaveBeenCalled();
  });

  it("changes and removes a contact, or answers 404", async () => {
    s.listContacts.mockResolvedValue([{ id: "c1", ...sam } as never]);
    s.updateContact.mockResolvedValueOnce({ id: "c1" } as never);
    expect((await PATCH(json("/api/contacts/c1", "PATCH", sam), ctx("c1"))).status).toBe(200);
    expect((await PATCH(json("/api/contacts/x", "PATCH", sam), ctx("x"))).status).toBe(404);
    s.deleteContact.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await DELETE(new Request("http://test"), ctx("c1"))).status).toBe(204);
    expect((await DELETE(new Request("http://test"), ctx("x"))).status).toBe(404);
  });
});

describe("/api/phrases", () => {
  it("lists saved messages", async () => {
    s.listPhrases.mockResolvedValue([]);
    expect(await (await GET_PHRASES()).json()).toEqual({ phrases: [] });
  });

  it("saves a short message and rejects empty or long ones", async () => {
    s.createPhrase.mockResolvedValue({ id: "p1" } as never);
    expect((await POST_PHRASE(json("/api/phrases", "POST", { text: "  Please  wait. " }))).status).toBe(201);
    expect(s.createPhrase).toHaveBeenCalledWith("user-1", "Please wait.");
    expect((await POST_PHRASE(json("/api/phrases", "POST", { text: "   " }))).status).toBe(400);
    expect((await POST_PHRASE(json("/api/phrases", "POST", { text: "x".repeat(201) }))).status).toBe(400);
  });

  it("removes a message or answers 404", async () => {
    s.deletePhrase.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await DELETE_PHRASE(new Request("http://test"), ctx("p1"))).status).toBe(204);
    expect((await DELETE_PHRASE(new Request("http://test"), ctx("x"))).status).toBe(404);
  });
});

describe("when a guardian manages contacts", () => {
  beforeEach(() => {
    refuseIfLocked.mockResolvedValue(lockedReply());
    s.listContacts.mockResolvedValue([{ id: "c1", ...sam, contact: "5550100142", can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false } as never]);
  });

  it("refuses adding, changing who they are, and removing", async () => {
    expect((await POST(json("/api/contacts", "POST", sam))).status).toBe(403);
    expect((await PATCH(json("/api/contacts/c1", "PATCH", { ...sam, name: "Samuel" }), ctx("c1"))).status).toBe(403);
    expect((await DELETE(new Request("http://test"), ctx("c1"))).status).toBe(403);
    expect(s.createContact).not.toHaveBeenCalled();
    expect(s.updateContact).not.toHaveBeenCalled();
    expect(s.deleteContact).not.toHaveBeenCalled();
  });

  it("still lets the user choose what a contact can see", async () => {
    s.updateContact.mockResolvedValue({ id: "c1" } as never);
    const res = await PATCH(json("/api/contacts/c1", "PATCH", { ...sam, can_get_lost_alerts: true }), ctx("c1"));
    expect(res.status).toBe(200);
    expect(s.updateContact).toHaveBeenCalledWith("user-1", "c1", expect.objectContaining({ can_get_lost_alerts: true }));
  });
});
