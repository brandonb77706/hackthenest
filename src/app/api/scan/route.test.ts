// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/camera-help/scan", () => ({ scanPhoto: vi.fn() }));
vi.mock("@/lib/db", () => ({ getCurrentUserId: vi.fn(async () => "user-1") }));
vi.mock("@/features/rewards/challengeService", () => ({ recordScan: vi.fn(async () => {}), claimChallenges: vi.fn(async () => []) }));

import { scanPhoto } from "@/features/camera-help/scan";
import * as challenges from "@/features/rewards/challengeService";
import { POST } from "./route";

const scan = vi.mocked(scanPhoto);
const post = (body: unknown) => POST(new Request("http://test/api/scan", { method: "POST", body: JSON.stringify(body) }));
const image = { data: btoa("photo"), mime: "image/jpeg" };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/scan", () => {
  it("returns what the photo is and what to do", async () => {
    const result = { what_it_is: "A bill.", summary: "Pay it.", actions: [], deadlines: [], confident: true };
    scan.mockResolvedValue({ ok: true, result });
    const res = await post({ image });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result, challenges: [] });
    expect(scan).toHaveBeenCalledWith(image);
  });

  it("counts the scan for the daily challenge, and says when the challenge is done", async () => {
    const result = { what_it_is: "A bill.", summary: "Pay it.", actions: [], deadlines: [], confident: true };
    scan.mockResolvedValue({ ok: true, result });
    const done = { id: "scans" as const, title: "Scan 3 letters or bills", tokens: 40, done: true, progress: "3 of 3 scans", percent: 100 };
    vi.mocked(challenges.claimChallenges).mockResolvedValueOnce([done]);
    const res = await POST(new Request("http://test/api/scan?tz=America%2FChicago", { method: "POST", body: JSON.stringify({ image }) }));
    expect(await res.json()).toEqual({ result, challenges: [done] });
    expect(challenges.recordScan).toHaveBeenCalledWith("user-1");
    expect(challenges.claimChallenges).toHaveBeenCalledWith("user-1", "America/Chicago");
  });

  it("still shows the answer if counting the scan fails", async () => {
    const result = { what_it_is: "A bill.", summary: "Pay it.", actions: [], deadlines: [], confident: true };
    scan.mockResolvedValue({ ok: true, result });
    vi.mocked(challenges.recordScan).mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ image });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result, challenges: [] });
    spy.mockRestore();
  });

  it("doesn't count a scan the AI couldn't read", async () => {
    scan.mockResolvedValue({ ok: false, reason: "bad_answer" });
    await post({ image });
    expect(challenges.recordScan).not.toHaveBeenCalled();
  });

  it("rejects things that aren't photos without calling the AI", async () => {
    expect((await post({ image: { data: "x", mime: "text/plain" } })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect(scan).not.toHaveBeenCalled();
  });

  it("rejects photos that are too big", async () => {
    const res = await post({ image: { data: "A".repeat(6_000_000), mime: "image/jpeg" } });
    expect(res.status).toBe(413);
    expect(scan).not.toHaveBeenCalled();
  });

  it("answers with a friendly error when the AI can't read it", async () => {
    scan.mockResolvedValue({ ok: false, reason: "bad_answer" });
    const res = await post({ image });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't read/);
  });
});
