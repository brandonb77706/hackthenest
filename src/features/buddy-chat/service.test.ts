// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const findCheckIns = vi.fn();
const findRoutines = vi.fn();
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(),
  CheckInModel: { find: (...args: unknown[]) => findCheckIns(...args) },
  RoutineModel: { find: (...args: unknown[]) => findRoutines(...args) },
}));
import { askGemini, isEmergency, weeklyProgress } from "./service";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("limits check-ins and routines to the signed-in user and counts steps, not routines", async () => {
  const now = new Date("2026-11-15T12:00:00Z");
  findCheckIns.mockReturnValue({ select: () => ({ lean: async () => [{ time: new Date("2026-11-14T01:00:00Z") }, { time: new Date("2026-11-14T02:00:00Z") }] }) });
  findRoutines.mockReturnValue({ select: () => ({ lean: async () => [{ title: "Morning" }] }) });
  const progress = await weeklyProgress("user-1", now);
  expect(findCheckIns).toHaveBeenCalledWith({ user_id: "user-1", status: "done", time: { $gte: new Date("2026-11-08T12:00:00Z"), $lte: now } });
  expect(findRoutines).toHaveBeenCalledWith({ user_id: "user-1", active: true });
  expect(progress).toMatchObject({ completedSteps: 2, daysWithActivity: 1, activeRoutines: 1 });
});

it("recognizes direct danger or self-harm statements", () => {
  expect(isEmergency("I want to kill myself")).toBe(true);
  expect(isEmergency("I am in danger")).toBe(true);
  expect(isEmergency("How am I doing this week?")).toBe(false);
});

it("returns a complete answer and rejects a response cut off by the output limit", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  const progress = { period: "the last 7 days", completedSteps: 48, daysWithActivity: 1, activeRoutines: 1, note: "Steps only" };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "You checked off 48 steps. Nice work!" }] } }] })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "You" }] } }] })));
  vi.stubGlobal("fetch", fetchMock);
  await expect(askGemini("How am I doing?", progress)).resolves.toBe("You checked off 48 steps. Nice work!");
  await expect(askGemini("How am I doing?", progress)).rejects.toThrow("incomplete response");
});
