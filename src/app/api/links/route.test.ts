// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const me = { id: "u1", name: "Jordan", email: "j@x.com", role: "user" as "user" | "guardian" };
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(async () => me) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/features/guardians/service", () => ({
  createCode: vi.fn(),
  redeemCode: vi.fn(),
  listLinks: vi.fn(),
  removeLink: vi.fn(),
  updateSharing: vi.fn(),
}));

import * as service from "@/features/guardians/service";
import { DELETE, PATCH } from "./[id]/route";
import { POST as createCode } from "./codes/route";
import { POST as redeem } from "./redeem/route";
import { GET } from "./route";

const s = vi.mocked(service);
const req = (body: unknown, method = "POST") => new Request("http://test", { method, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  me.role = "user";
});

describe("POST /api/links/codes", () => {
  it("makes a code for the signed-in account", async () => {
    s.createCode.mockResolvedValue({ code: "K7P2QX", expires_at: "2026-11-16T00:00:00.000Z" });
    const res = await createCode(req({ name: "Jordan" }));
    expect(await res.json()).toEqual({ code: "K7P2QX", expires_at: "2026-11-16T00:00:00.000Z" });
    expect(s.createCode).toHaveBeenCalledWith(me, "Jordan");
  });
});

describe("POST /api/links/redeem", () => {
  it("links the accounts", async () => {
    s.redeemCode.mockResolvedValue({ ok: true, link_id: "l1", other_name: "Sam", name: null });
    const res = await redeem(req({ code: "k7p 2qx" }));
    expect(await res.json()).toMatchObject({ link_id: "l1", other_name: "Sam" });
    expect(s.redeemCode).toHaveBeenCalledWith(me, "k7p 2qx");
  });

  it("explains each problem with the right status", async () => {
    s.redeemCode.mockResolvedValueOnce({ ok: false, problem: "bad_format" });
    expect((await redeem(req({ code: "x" }))).status).toBe(400);
    s.redeemCode.mockResolvedValueOnce({ ok: false, problem: "not_found" });
    expect((await redeem(req({ code: "AAAAAA" }))).status).toBe(404);
    s.redeemCode.mockResolvedValueOnce({ ok: false, problem: "used" });
    const used = await redeem(req({ code: "AAAAAA" }));
    expect(used.status).toBe(409);
    expect(await used.json()).toEqual({ error: "That code was already used. Ask for a new one." });
  });
});

describe("GET /api/links", () => {
  it("lists the signed-in account's links", async () => {
    s.listLinks.mockResolvedValue([]);
    expect(await (await GET()).json()).toEqual({ role: "user", links: [] });
    expect(s.listLinks).toHaveBeenCalledWith(me);
  });
});

describe("PATCH /api/links/:id", () => {
  it("saves only the sharing switches", async () => {
    s.updateSharing.mockResolvedValue(true);
    const res = await PATCH(req({ can_see_routines: true, guardian_id: "evil" }, "PATCH"), ctx("l1"));
    expect(await res.json()).toEqual({ can_see_routines: true });
    expect(s.updateSharing).toHaveBeenCalledWith(me, "l1", { can_see_routines: true });
  });

  it("refuses bad values, empty changes, and links that aren't yours", async () => {
    expect((await PATCH(req({ can_see_routines: "yes" }, "PATCH"), ctx("l1"))).status).toBe(400);
    expect((await PATCH(req({}, "PATCH"), ctx("l1"))).status).toBe(400);
    s.updateSharing.mockResolvedValue(false);
    expect((await PATCH(req({ can_get_lost_alerts: true }, "PATCH"), ctx("l2"))).status).toBe(404);
  });
});

describe("DELETE /api/links/:id", () => {
  it("removes a link the account is part of", async () => {
    s.removeLink.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await DELETE(new Request("http://test"), ctx("l1"))).status).toBe(204);
    expect((await DELETE(new Request("http://test"), ctx("other"))).status).toBe(404);
  });
});
