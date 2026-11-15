// Camera help: the AI explains a photo of a letter, bill, or form. Server only.
// The photo isn't saved by Bridge; the Base44 function stores it privately so
// the AI can read it through a short-lived link.

import { ai, type AIProvider } from "@/lib/ai";
import type { ImageInput } from "@/lib/ai/types";
import { buildCameraHelpPrompt, cameraHelpSchema, parseCameraHelp, type CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";

/** Asked again once if the first answer fails the check. */
const ATTEMPTS = 2;

export type ScanResult = { ok: true; result: CameraHelpResponse } | { ok: false; reason: "bad_answer" | "ai_error" };

export async function scanPhoto(image: ImageInput, provider: AIProvider = ai.forFeature("cameraHelp")): Promise<ScanResult> {
  let reason: "bad_answer" | "ai_error" = "bad_answer";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const raw = await provider.generateJSON({ prompt: buildCameraHelpPrompt(), schema: cameraHelpSchema, images: [image] });
      const parsed = parseCameraHelp(raw);
      if (parsed.ok) return { ok: true, result: parsed.value };
      reason = "bad_answer";
      console.warn(`[scan] attempt ${attempt}: ${parsed.error}`);
    } catch (error) {
      reason = "ai_error";
      console.warn(`[scan] attempt ${attempt}:`, error instanceof Error ? error.message : error);
    }
  }
  return { ok: false, reason };
}
