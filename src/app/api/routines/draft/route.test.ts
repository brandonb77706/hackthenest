// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => {}),
  getCurrentUserId: vi.fn(async () => "user-1"),
  UserProfileModel: { findOne: (...args: unknown[]) => findOne(...args) },
}));
vi.mock("@/features/routine-builder/aiDraft", () => ({ draftRoutine: vi.fn() }));

import { draftRoutine } from "@/features/routine-builder/aiDraft";
import type { RoutineInput } from "@/features/routine-builder/routineInput";
import { POST } from "./route";

const draft = vi.mocked(draftRoutine);
const routine: RoutineInput = {
  title: "Take medicine",
  goal: "take my medicine",
  days: ["mon"],
  start_time: "08:00",
  tone: "teal",
  remind: true,
  steps: [{ text: "Take your pill", minutes: 2 }],
};
const post = (body: unknown) =>
  POST(new Request("http://test/api/routines/draft", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue(null);
  draft.mockResolvedValue({ ok: true, routine });
});

describe("POST /api/routines/draft", () => {
  it("returns a draft and saves nothing", async () => {
    const res = await post({ goal: "take my medicine" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ routine, supportLevel: "high" });
  });

  it("uses the user's saved support level", async () => {
    findOne.mockResolvedValue({ support_level: "low" });
    await post({ goal: "take my medicine" });
    expect(draft).toHaveBeenCalledWith("take my medicine", "low");
  });

  it("uses the support level from Smaller or Bigger steps when sent", async () => {
    findOne.mockResolvedValue({ support_level: "low" });
    await post({ goal: "take my medicine", supportLevel: "medium" });
    expect(draft).toHaveBeenCalledWith("take my medicine", "medium");
  });

  it("gives the most help when there's no profile or database", async () => {
    findOne.mockRejectedValue(new Error("no database"));
    await post({ goal: "pills", supportLevel: "extreme" });
    expect(draft).toHaveBeenCalledWith("pills", "high");
  });

  it("asks for a goal when it's empty or too long", async () => {
    expect((await post({ goal: "  " })).status).toBe(400);
    expect((await post({ goal: "x".repeat(301) })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect(draft).not.toHaveBeenCalled();
  });

  it("answers with a friendly error when the AI can't make steps", async () => {
    draft.mockResolvedValue({ ok: false, reason: "bad_answer" });
    const res = await post({ goal: "pills" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't make steps/);
  });
});
