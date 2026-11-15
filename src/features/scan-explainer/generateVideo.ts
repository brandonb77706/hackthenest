import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";
const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_VIDEO_BASE64_LENGTH = 24 * 1024 * 1024;

export class VideoGenerationError extends Error {
  constructor(readonly reason: "not_configured" | "provider_error" | "missing_video") {
    super(reason);
  }
}

interface VideoPlan { prompt: string; durationSeconds: number }

async function createVideoPlan(result: CameraHelpResponse, apiKey: string): Promise<VideoPlan> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: [
        "You write a video-generation prompt for an accessible document explainer.",
        "Use only the checked scan interpretation below. Do not invent facts, advice, or outcomes.",
        "Create a gentle 2D scene sequence that explains the main point and next steps with clear visual metaphors.",
        "Do not include names, addresses, account numbers, amounts, dates, or readable text in the visuals.",
        "No narration; Bridge will read the checked explanation separately.",
        "Choose a duration from 3 to 10 seconds based on the amount and complexity of the explanation. Return the minimum duration that can communicate the key idea.",
        `Checked scan interpretation (JSON): ${JSON.stringify(result)}`,
      ].join("\n") }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { prompt: { type: "string" }, durationSeconds: { type: "integer", minimum: 3, maximum: 10 } },
          required: ["prompt", "durationSeconds"],
          additionalProperties: false,
        },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new VideoGenerationError("provider_error");
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
  try {
    const plan = JSON.parse(text) as Partial<VideoPlan>;
    if (typeof plan.prompt !== "string" || !plan.prompt.trim() || !Number.isInteger(plan.durationSeconds) || plan.durationSeconds! < 3 || plan.durationSeconds! > 10) {
      throw new Error("invalid plan");
    }
    return { prompt: plan.prompt, durationSeconds: plan.durationSeconds! };
  } catch {
    throw new VideoGenerationError("missing_video");
  }
}

/** Analyze the checked scan result into a video prompt, then generate the clip. */
export async function generateScanExplanationVideo(
  result: CameraHelpResponse,
): Promise<Uint8Array> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new VideoGenerationError("not_configured");

  const plan = await createVideoPlan(result, apiKey);

  let response: Response;
  try {
    response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: "gemini-omni-1.1-flash",
        input: plan.prompt,
        response_format: { type: "video", delivery: "inline", duration: `${plan.durationSeconds}s`, resolution: "360p" },
        store: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });
  } catch {
    throw new VideoGenerationError("provider_error");
  }

  if (!response.ok) throw new VideoGenerationError("provider_error");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VideoGenerationError("missing_video");
  }

  const steps = (payload as { steps?: unknown })?.steps;
  if (!Array.isArray(steps)) throw new VideoGenerationError("missing_video");
  let videoData: string | undefined;
  for (const step of steps) {
    const record = step as { type?: unknown; content?: unknown };
    if (record.type !== "model_output" || !Array.isArray(record.content)) continue;
    for (const item of record.content) {
      const candidate = item as { type?: unknown; data?: unknown };
      if (candidate.type === "video" && typeof candidate.data === "string") videoData = candidate.data;
    }
  }

  if (!videoData || videoData.length > MAX_VIDEO_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(videoData)) {
    throw new VideoGenerationError("missing_video");
  }
  return new Uint8Array(Buffer.from(videoData, "base64"));
}
