// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/home/service", () => ({ getToday: vi.fn(), markStepDone: vi.fn() }));

import * as service from "@/features/home/service";
import { POST } from "../routines/[id]/steps/[stepId]/done/route";
import { GET } from "./route";

const s = vi.mocked(service);
const ctx = (id: string, stepId: string) => ({ params: Promise.resolve({ id, stepId }) });
const post = (body?: unknown) =>
  new Request("http://test", { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/today", () => {
  it("uses the user's time zone and isn't cached", async () => {
    s.getToday.mockResolvedValue({ name: "Jordan", streak: 4, tokens: 0, routines: [], settings: { color_scheme: "blue", show_buddy: true, buddy_name: "Fox" } });
    const res = await GET(new Request("http://test/api/today?tz=America%2FChicago"));
    expect(await res.json()).toMatchObject({ name: "Jordan", streak: 4 });
    expect(s.getToday).toHaveBeenCalledWith("user-1", "America/Chicago");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("falls back to UTC without a time zone", async () => {
    s.getToday.mockResolvedValue({ name: "", streak: 0, tokens: 0, routines: [], settings: { color_scheme: "blue", show_buddy: true, buddy_name: "Fox" } });
    await GET(new Request("http://test/api/today"));
    expect(s.getToday).toHaveBeenCalledWith("user-1", "UTC");
  });
});

describe("POST /api/routines/[id]/steps/[stepId]/done", () => {
  it("saves that the step was finished", async () => {
    s.markStepDone.mockResolvedValue(true);
    const res = await POST(post({}), ctx("r1", "s1"));
    expect(res.status).toBe(204);
    expect(s.markStepDone).toHaveBeenCalledWith("user-1", "r1", "s1", false);
  });

  it("records when help was used, and works with no body", async () => {
    s.markStepDone.mockResolvedValue(true);
    await POST(post({ used_help: true }), ctx("r1", "s1"));
    expect(s.markStepDone).toHaveBeenLastCalledWith("user-1", "r1", "s1", true);
    await POST(post(), ctx("r1", "s2"));
    expect(s.markStepDone).toHaveBeenLastCalledWith("user-1", "r1", "s2", false);
  });

  it("answers 404 for a step that isn't in that routine or isn't the user's", async () => {
    s.markStepDone.mockResolvedValue(false);
    expect((await POST(post({}), ctx("r1", "nope"))).status).toBe(404);
  });
});
