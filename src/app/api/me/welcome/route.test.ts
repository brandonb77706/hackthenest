// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/onboarding/service", () => ({ finishWelcome: vi.fn() }));

import { finishWelcome } from "@/features/onboarding/service";
import { POST } from "./route";

const finish = vi.mocked(finishWelcome);
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/me/welcome", () => {
  it("saves Welcome for the signed-in user", async () => {
    finish.mockResolvedValue({ ok: true, buddy_name: "Fox" });
    const res = await POST(req({ name: "Jordan", avatar_id: "a1" }));
    expect(await res.json()).toEqual({ buddy_name: "Fox" });
    expect(finish).toHaveBeenCalledWith("user-1", { name: "Jordan", avatar_id: "a1" });
  });

  it("refuses bad input before touching the database", async () => {
    const res = await POST(req({ name: "  ", avatar_id: "a1" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please type your name." });
    expect(finish).not.toHaveBeenCalled();
  });

  it("refuses a Buddy that isn't a free starter", async () => {
    finish.mockResolvedValue({ ok: false, error: "Please pick one of these Buddies." });
    const res = await POST(req({ name: "Jordan", avatar_id: "shop1" }));
    expect(res.status).toBe(400);
  });
});
