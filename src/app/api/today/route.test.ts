// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/home/service", () => ({ getToday: vi.fn(), markStepDone: vi.fn() }));
vi.mock("@/features/rewards/service", () => ({ awardStepDone: vi.fn(async () => []) }));
vi.mock("@/features/rewards/streakService", () => ({ recordStreakDay: vi.fn(async () => ({ streak: 1, awards: [], unlocked: [] })) }));

import * as service from "@/features/home/service";
import * as rewards from "@/features/rewards/service";
import * as streaks from "@/features/rewards/streakService";
import { POST } from "../routines/[id]/steps/[stepId]/done/route";
import { GET } from "./route";

const s = vi.mocked(service);
const r = vi.mocked(rewards);
const st = vi.mocked(streaks);
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
    s.markStepDone.mockResolvedValue("c1");
    const res = await POST(post({}), ctx("r1", "s1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ earned: 0, awards: [], finished_routine: false, streak: null, unlocked: [] });
    expect(s.markStepDone).toHaveBeenCalledWith("user-1", "r1", "s1", false);
  });

  it("records when help was used, and works with no body", async () => {
    s.markStepDone.mockResolvedValue("c1");
    await POST(post({ used_help: true }), ctx("r1", "s1"));
    expect(s.markStepDone).toHaveBeenLastCalledWith("user-1", "r1", "s1", true);
    await POST(post(), ctx("r1", "s2"));
    expect(s.markStepDone).toHaveBeenLastCalledWith("user-1", "r1", "s2", false);
  });

  it("answers 404 for a step that isn't in that routine or isn't the user's", async () => {
    s.markStepDone.mockResolvedValue(null);
    expect((await POST(post({}), ctx("r1", "nope"))).status).toBe(404);
    expect(r.awardStepDone).not.toHaveBeenCalled();
  });

  it("awards tokens for the saved check-in in the user's time zone", async () => {
    s.markStepDone.mockResolvedValue("c1");
    await POST(new Request("http://test/done?tz=America%2FChicago", { method: "POST", body: "{}" }), ctx("r1", "s1"));
    expect(r.awardStepDone).toHaveBeenCalledWith("user-1", {
      checkInId: "c1",
      routineId: "r1",
      stepId: "s1",
      usedHelp: false,
      timeZone: "America/Chicago",
    });
  });

  it("passes help along so rewards can treat it the same, and defaults to UTC", async () => {
    s.markStepDone.mockResolvedValue("c1");
    await POST(post({ used_help: true }), ctx("r1", "s1"));
    expect(r.awardStepDone).toHaveBeenCalledWith("user-1", expect.objectContaining({ usedHelp: true, timeZone: "UTC" }));
  });

  it("still answers OK when rewards fail, because the step was saved", async () => {
    s.markStepDone.mockResolvedValue("c1");
    r.awardStepDone.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({}), ctx("r1", "s1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ earned: 0 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("answers with the tokens earned, and moves the streak when the routine is finished", async () => {
    s.markStepDone.mockResolvedValue("c1");
    r.awardStepDone.mockResolvedValueOnce([
      { amount: 5, reason: "step" },
      { amount: 20, reason: "routine" },
    ]);
    st.recordStreakDay.mockResolvedValueOnce({ streak: 3, awards: [{ amount: 25, reason: "streak" }], unlocked: [] });
    const res = await POST(new Request("http://test/done?tz=America%2FChicago", { method: "POST", body: "{}" }), ctx("r1", "s3"));
    expect(await res.json()).toEqual({
      earned: 50,
      awards: [
        { amount: 5, reason: "step" },
        { amount: 20, reason: "routine" },
        { amount: 25, reason: "streak" },
      ],
      finished_routine: true,
      streak: 3,
      unlocked: [],
    });
    expect(st.recordStreakDay).toHaveBeenCalledWith("user-1", "America/Chicago", "c1");
  });

  it("doesn't touch the streak for a step in the middle", async () => {
    s.markStepDone.mockResolvedValue("c1");
    r.awardStepDone.mockResolvedValueOnce([{ amount: 5, reason: "step" }]);
    expect(await (await POST(post({}), ctx("r1", "s1"))).json()).toMatchObject({ earned: 5, finished_routine: false });
    expect(st.recordStreakDay).not.toHaveBeenCalled();
  });
});
