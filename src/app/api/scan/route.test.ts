// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/camera-help/scan", () => ({ scanPhoto: vi.fn() }));

import { scanPhoto } from "@/features/camera-help/scan";
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
    expect(await res.json()).toEqual({ result });
    expect(scan).toHaveBeenCalledWith(image);
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
