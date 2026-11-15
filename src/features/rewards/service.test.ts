// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake MongoDB: tests never touch the real database.
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(async () => {}),
  StepModel: { find: vi.fn() },
  CheckInModel: { find: vi.fn() },
  TokenTransactionModel: { countDocuments: vi.fn(), insertMany: vi.fn(async () => []) },
}));

import { CheckInModel, StepModel, TokenTransactionModel } from "@/lib/db";
import { awardStepDone, type StepDoneEvent } from "./service";

const steps = vi.mocked(StepModel.find);
const checkIns = vi.mocked(CheckInModel.find);
const count = vi.mocked(TokenTransactionModel.countDocuments);
const insert = vi.mocked(TokenTransactionModel.insertMany);

// 3 p.m. in Chicago on Nov 15 (21:00 UTC)
const NOW = new Date("2026-11-15T21:00:00Z");
const event: StepDoneEvent = { checkInId: "c9", routineId: "r1", stepId: "s3", usedHelp: false, timeZone: "America/Chicago" };

/** Sets up what the fake database returns. */
function db(opts: { stepIds: string[]; earlier?: { step_id: string; time: string }[]; firstRoutineCount?: number }) {
  steps.mockResolvedValue(opts.stepIds.map((id) => ({ _id: id })) as never);
  checkIns.mockResolvedValue(
    (opts.earlier ?? []).map((c) => ({ get: (key: "step_id" | "time") => (key === "time" ? new Date(c.time) : c.step_id) })) as never,
  );
  count.mockResolvedValue((opts.firstRoutineCount ?? 1) as never);
}

const earlyToday = (step_id: string) => ({ step_id, time: "2026-11-15T15:00:00Z" }); // 9 a.m. Chicago

beforeEach(() => vi.clearAllMocks());

describe("awardStepDone", () => {
  it("saves 5 tokens for a middle step, linked to the check-in", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s1")] });
    const awards = await awardStepDone("user-1", { ...event, stepId: "s2" }, NOW);
    expect(awards).toEqual([{ amount: 5, reason: "step" }]);
    expect(insert).toHaveBeenCalledWith([{ user_id: "user-1", amount: 5, reason: "step", ref_id: "c9" }]);
  });

  it("saves the routine bonus when this tap finishes the routine", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s1"), earlyToday("s2")] });
    await awardStepDone("user-1", event, NOW);
    expect(insert).toHaveBeenCalledWith([
      { user_id: "user-1", amount: 5, reason: "step", ref_id: "c9" },
      { user_id: "user-1", amount: 20, reason: "routine", ref_id: "c9" },
    ]);
  });

  it("saves the first routine bonus when the user never got it", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s1"), earlyToday("s2")], firstRoutineCount: 0 });
    const awards = await awardStepDone("user-1", event, NOW);
    expect(awards.map((a) => a.reason)).toEqual(["step", "routine", "first_routine"]);
  });

  it("saves nothing for a step already done today", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s3")] });
    expect(await awardStepDone("user-1", event, NOW)).toEqual([]);
    expect(insert).not.toHaveBeenCalled();
  });

  it("uses the user's own day: a step done last night (their time) counts as yesterday", async () => {
    // 11 p.m. Chicago on Nov 14 is 05:00 UTC on Nov 15: same UTC day, but yesterday for the user.
    db({ stepIds: ["s1", "s2", "s3"], earlier: [{ step_id: "s3", time: "2026-11-15T05:00:00Z" }] });
    expect(await awardStepDone("user-1", event, NOW)).toEqual([{ amount: 5, reason: "step" }]);
  });

  it("only looks at the user's own records, and only check-ins saved before this one", async () => {
    db({ stepIds: ["s1"] });
    await awardStepDone("user-1", event, NOW);
    expect(steps).toHaveBeenCalledWith({ user_id: "user-1", routine_id: "r1" }, { _id: 1 });
    expect(checkIns).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", routine_id: "r1", status: "done", _id: { $lt: "c9" } }),
      expect.anything(),
    );
    expect(count).toHaveBeenCalledWith({ user_id: "user-1", reason: "first_routine" });
  });

  it("using help saves the same tokens", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s1"), earlyToday("s2")] });
    const without = await awardStepDone("user-1", event, NOW);
    const withHelp = await awardStepDone("user-1", { ...event, usedHelp: true }, NOW);
    expect(withHelp).toEqual(without);
  });

  it("never saves a negative amount", async () => {
    db({ stepIds: ["s1", "s2", "s3"], earlier: [earlyToday("s1"), earlyToday("s2")], firstRoutineCount: 0 });
    await awardStepDone("user-1", event, NOW);
    const saved = insert.mock.calls[0][0] as unknown as { amount: number }[];
    for (const row of saved) expect(row.amount).toBeGreaterThan(0);
  });
});
