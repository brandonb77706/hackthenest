// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/me/service", () => ({ chooseBuddy: vi.fn(), updateMeSettings: vi.fn() }));

import * as service from "@/features/me/service";
import { PUT } from "./buddy/route";
import { PATCH } from "./settings/route";

const s = vi.mocked(service);
const req = (method: string, body: unknown) => new Request("http://test", { method, body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("PUT /api/me/buddy", () => {
  it("equips the Buddy", async () => {
    s.chooseBuddy.mockResolvedValue({ ok: true, name: "Fox" });
    const res = await PUT(req("PUT", { avatar_id: "a1" }));
    expect(await res.json()).toEqual({ buddy_name: "Fox" });
    expect(s.chooseBuddy).toHaveBeenCalledWith("user-1", "a1");
  });

  it("refuses a locked Buddy and an unknown one", async () => {
    s.chooseBuddy.mockResolvedValueOnce({ ok: false, reason: "locked" }).mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect((await PUT(req("PUT", { avatar_id: "shop1" }))).status).toBe(403);
    expect((await PUT(req("PUT", { avatar_id: "nope" }))).status).toBe(404);
    expect((await PUT(req("PUT", {}))).status).toBe(400);
  });
});

describe("PATCH /api/me/settings", () => {
  it("saves a color scheme and the Buddy switch", async () => {
    expect((await PATCH(req("PATCH", { color_scheme: "contrast", show_buddy: false }))).status).toBe(200);
    expect(s.updateMeSettings).toHaveBeenCalledWith("user-1", { color_scheme: "contrast", show_buddy: false });
  });

  it("rejects unknown schemes, odd values, and empty requests", async () => {
    expect((await PATCH(req("PATCH", { color_scheme: "purple" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { show_buddy: "yes" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", {}))).status).toBe(400);
    expect(s.updateMeSettings).not.toHaveBeenCalled();
  });
});
