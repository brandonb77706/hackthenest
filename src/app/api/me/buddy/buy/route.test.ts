// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/rewards/shopService", () => ({ buyBuddy: vi.fn() }));

import { buyBuddy } from "@/features/rewards/shopService";
import { POST } from "./route";

const buy = vi.mocked(buyBuddy);
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/me/buddy/buy", () => {
  it("buys for the signed-in user and returns the coins left", async () => {
    buy.mockResolvedValue({ ok: true, name: "Owl", tokens: 0 });
    const res = await POST(req({ avatar_id: "owl" }));
    expect(await res.json()).toEqual({ buddy_name: "Owl", tokens: 0 });
    expect(buy).toHaveBeenCalledWith("user-1", "owl");
  });

  it("explains why it can't buy", async () => {
    buy.mockResolvedValueOnce({ ok: false, name: "Owl", check: { ok: false, reason: "not_enough", missing: 60 } });
    const poor = await POST(req({ avatar_id: "owl" }));
    expect(poor.status).toBe(402);
    expect(await poor.json()).toEqual({ error: "You need 60 more coins for Owl. Finish routines to earn more.", reason: "not_enough" });

    buy.mockResolvedValueOnce({ ok: false, name: "Owl", check: { ok: false, reason: "owned" } });
    expect((await POST(req({ avatar_id: "owl" }))).status).toBe(409);
    buy.mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect((await POST(req({ avatar_id: "nope" }))).status).toBe(404);
    expect((await POST(req({}))).status).toBe(400);
  });
});
