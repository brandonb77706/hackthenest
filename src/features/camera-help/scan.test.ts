// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "@/lib/ai";
import { scanPhoto } from "./scan";

const image = { data: btoa("photo"), mime: "image/jpeg" as const };
const good = {
  what_it_is: "An electric bill.",
  summary: "You owe $84.12.",
  actions: ["Pay $84.12 by November 28."],
  deadlines: [{ title: "Pay bill", date: "2026-11-28" }],
  confident: true,
};

function sequence(...answers: unknown[]) {
  const generateJSON = vi.fn();
  for (const a of answers) {
    if (a instanceof Error) generateJSON.mockRejectedValueOnce(a);
    else generateJSON.mockResolvedValueOnce(a);
  }
  return { provider: { generateText: vi.fn(), generateJSON } as unknown as AIProvider, generateJSON };
}

beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("scanPhoto", () => {
  it("sends the photo with the camera help prompt and returns the checked answer", async () => {
    const { provider, generateJSON } = sequence(good);
    expect(await scanPhoto(image, provider)).toEqual({ ok: true, result: good });
    const input = generateJSON.mock.calls[0][0];
    expect(input.images).toEqual([image]);
    expect(input.prompt).toMatch(/took this photo/);
    expect(input.prompt).toMatch(/Never guess amounts or dates/);
  });

  it("asks again once when the first answer is bad", async () => {
    const { provider, generateJSON } = sequence({ summary: "no title" }, good);
    expect((await scanPhoto(image, provider)).ok).toBe(true);
    expect(generateJSON).toHaveBeenCalledTimes(2);
  });

  it("gives up after two bad answers, or two AI errors", async () => {
    expect(await scanPhoto(image, sequence("nope", "still nope").provider)).toEqual({ ok: false, reason: "bad_answer" });
    expect(await scanPhoto(image, sequence(new Error("down"), new Error("down")).provider)).toEqual({ ok: false, reason: "ai_error" });
  });
});
