// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { geminiScanProvider } from "./analyzeImage";
import { generateScanExplanationVideo } from "./generateVideo";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("sends the supplied image to Gemini and returns its actual response", async () => {
  vi.stubEnv("GEMINI_API_KEY", "fake-key");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"what_it_is":"A neural network slide"}' }] } }] })));
  vi.stubGlobal("fetch", fetchMock);
  const result = await geminiScanProvider().generateJSON({ prompt: "Describe", schema: {}, images: [{ mime: "image/png", data: "YWJj" }] });
  expect(result).toEqual({ what_it_is: "A neural network slide" });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[1].inlineData.data).toBe("YWJj");
});

it("turns the checked scan into a Gemini-authored prompt and uses Gemini's chosen duration", async () => {
  vi.stubEnv("GEMINI_API_KEY", "fake-key");
  const result = { what_it_is: "Slide", summary: "Short", actions: [], deadlines: [], confident: true };
  const plan = { prompt: "Animate a simple network diagram", durationSeconds: 7 };
  const video = btoa("mp4");
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }] })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "video", data: video }] }] })));
  vi.stubGlobal("fetch", fetchMock);
  const bytes = await generateScanExplanationVideo(result);
  expect(bytes).toEqual(new Uint8Array(Buffer.from(video, "base64")));
  const plannerRequest = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(plannerRequest.contents[0].parts[0].text).toContain("Short");
  const videoRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(videoRequest.input).toBe(plan.prompt);
  expect(videoRequest.response_format.duration).toBe("7s");
});
