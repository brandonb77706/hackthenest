// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
const refuseIfLocked = vi.fn(async (): Promise<Response | null> => null);
vi.mock("@/features/guardians/service", () => ({ refuseIfLocked: (...a: unknown[]) => refuseIfLocked(...(a as [])) }));
const lockedReply = () => Response.json({ error: "Sam manages your routines. Ask Sam to make changes.", locked: true }, { status: 403 });
const claimChallenges = vi.fn<(...a: unknown[]) => Promise<unknown[]>>(async () => []);
vi.mock("@/features/rewards/challengeService", () => ({ claimChallenges: (...a: unknown[]) => claimChallenges(...a) }));
vi.mock("@/features/routine-builder/service", () => ({
  listRoutines: vi.fn(),
  createRoutine: vi.fn(),
  getRoutine: vi.fn(),
  updateRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}));

import * as service from "@/features/routine-builder/service";
import type { RoutineWithSteps } from "@/features/routine-builder/service";
import { DELETE, GET as GET_ONE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

const s = vi.mocked(service);
const body = {
  title: "Take medicine",
  goal: "",
  days: ["mon"],
  start_time: "08:00",
  steps: [{ text: "Take your pill", minutes: 2 }],
};
const saved: RoutineWithSteps = {
  id: "r1",
  user_id: "user-1",
  active: true,
  tone: "teal",
  remind: true,
  added_by: null,
  ...body,
  days: ["mon"],
  steps: [],
};

const json = (data: unknown, method = "POST") =>
  new Request("http://test/api/routines", { method, body: JSON.stringify(data) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/routines", () => {
  it("lists the current user's routines", async () => {
    s.listRoutines.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ routines: [] });
    expect(s.listRoutines).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/routines", () => {
  it("saves a valid routine for the current user", async () => {
    s.createRoutine.mockResolvedValue(saved);
    const res = await POST(json(body));
    expect(res.status).toBe(201);
    expect(s.createRoutine).toHaveBeenCalledWith("user-1", expect.objectContaining({ title: "Take medicine" }));
  });

  it("returns plain errors for an invalid routine and saves nothing", async () => {
    const res = await POST(json({ ...body, title: "", steps: [] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errors.title).toMatch(/Add a name/);
    expect(data.errors.steps).toMatch(/at least one/);
    expect(s.createRoutine).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't a routine", async () => {
    const res = await POST(new Request("http://test", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
    expect(s.createRoutine).not.toHaveBeenCalled();
  });
});

describe("/api/routines/[id]", () => {
  it("GET returns the routine or 404", async () => {
    s.getRoutine.mockResolvedValueOnce(saved).mockResolvedValueOnce(null);
    expect((await GET_ONE(new Request("http://test"), ctx("r1"))).status).toBe(200);
    expect((await GET_ONE(new Request("http://test"), ctx("missing"))).status).toBe(404);
    expect(s.getRoutine).toHaveBeenCalledWith("user-1", "r1");
  });

  it("PATCH updates a valid routine or answers 404", async () => {
    s.updateRoutine.mockResolvedValueOnce(saved).mockResolvedValueOnce(null);
    expect((await PATCH(json(body, "PATCH"), ctx("r1"))).status).toBe(200);
    expect((await PATCH(json(body, "PATCH"), ctx("missing"))).status).toBe(404);
  });

  it("PATCH checks the routine before saving", async () => {
    const res = await PATCH(json({ ...body, days: [] }, "PATCH"), ctx("r1"));
    expect(res.status).toBe(400);
    expect(s.updateRoutine).not.toHaveBeenCalled();
  });

  it("DELETE answers 204, or 404 when there's nothing to delete", async () => {
    s.deleteRoutine.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await DELETE(new Request("http://test"), ctx("r1"))).status).toBe(204);
    expect((await DELETE(new Request("http://test"), ctx("missing"))).status).toBe(404);
    expect(s.deleteRoutine).toHaveBeenCalledWith("user-1", "r1");
  });
});

describe("when a guardian manages routines", () => {
  it("refuses to make, change or delete a routine, and saves nothing", async () => {
    refuseIfLocked.mockResolvedValue(lockedReply());
    const post = await POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }));
    expect(post.status).toBe(403);
    expect(await post.json()).toMatchObject({ locked: true });
    const ctx = { params: Promise.resolve({ id: "r1" }) };
    expect((await PATCH(new Request("http://test", { method: "PATCH", body: JSON.stringify(body) }), ctx)).status).toBe(403);
    expect((await DELETE(new Request("http://test"), ctx)).status).toBe(403);
    expect(s.createRoutine).not.toHaveBeenCalled();
    expect(s.updateRoutine).not.toHaveBeenCalled();
    expect(s.deleteRoutine).not.toHaveBeenCalled();
    expect(refuseIfLocked).toHaveBeenCalledWith("user-1", "routines");
    refuseIfLocked.mockResolvedValue(null);
  });
});

describe("making a routine and the daily challenge", () => {
  it("checks the challenge in the user's day and says when it's done", async () => {
    s.createRoutine.mockResolvedValue({ id: "r1" } as never);
    const done = { id: "new_routine", title: "Make a new routine", tokens: 30, done: true, progress: "Made one today", percent: 100 };
    claimChallenges.mockResolvedValueOnce([done]);
    const res = await POST(new Request("http://test/api/routines?tz=America%2FChicago", { method: "POST", body: JSON.stringify(body) }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ routine: { id: "r1" }, challenges: [done] });
    expect(claimChallenges).toHaveBeenCalledWith("user-1", "America/Chicago");
  });

  it("still saves the routine when checking challenges fails", async () => {
    s.createRoutine.mockResolvedValue({ id: "r1" } as never);
    claimChallenges.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ routine: { id: "r1" }, challenges: [] });
    spy.mockRestore();
  });
});
