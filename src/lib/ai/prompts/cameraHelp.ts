// Help with this, camera (owner: Adrian, confirm). Source: docs/ai-prompts.md section 2.
// Send the photo URL as `files` with the prompt.

import { fail, isNonEmptyString, isRecord, ok, type ParseResult } from "./parse";

export interface CameraDeadline {
  title: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface CameraHelpResponse {
  what_it_is: string;
  summary: string;
  actions: string[];
  deadlines: CameraDeadline[];
  confident: boolean;
}

export const CAMERA_HELP_PROMPT = `A person with a disability took this photo and needs help understanding it.
Explain it like a calm, kind friend.

Rules:
- Say what it is in one sentence.
- Summarize what it means in 2 to 3 short sentences.
- List what they need to do, one action per item, in order.
- List any deadlines with dates.
- If you can't read it clearly, say so. Never guess amounts or dates.
- No legal or medical advice. If it looks urgent, say who to call.

Return JSON only.`;

export function buildCameraHelpPrompt(): string {
  return CAMERA_HELP_PROMPT;
}

export const cameraHelpSchema = {
  type: "object",
  properties: {
    what_it_is: { type: "string" },
    summary: { type: "string" },
    actions: { type: "array", items: { type: "string" } },
    deadlines: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, date: { type: "string" } },
        required: ["title", "date"],
      },
    },
    confident: { type: "boolean" },
  },
  required: ["what_it_is", "summary", "actions", "deadlines", "confident"],
} as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function parseCameraHelp(raw: unknown): ParseResult<CameraHelpResponse> {
  if (!isRecord(raw)) return fail("Response is not an object");
  if (!isNonEmptyString(raw.what_it_is)) return fail("Missing what_it_is");
  if (!isNonEmptyString(raw.summary)) return fail("Missing summary");
  if (typeof raw.confident !== "boolean") return fail("Missing confident");
  if (!Array.isArray(raw.actions) || !raw.actions.every(isNonEmptyString)) {
    return fail("actions must be a list of text");
  }
  if (!Array.isArray(raw.deadlines)) return fail("Missing deadlines");

  const deadlines: CameraDeadline[] = [];
  for (const d of raw.deadlines) {
    // Never pass on a date we can't trust. Drop it instead of guessing.
    if (isRecord(d) && isNonEmptyString(d.title) && typeof d.date === "string" && isRealDate(d.date)) {
      deadlines.push({ title: d.title.trim(), date: d.date });
    }
  }

  return ok({
    what_it_is: raw.what_it_is.trim(),
    summary: raw.summary.trim(),
    actions: raw.actions.map((a) => a.trim()),
    deadlines,
    confident: raw.confident,
  });
}
