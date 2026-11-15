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
- List any deadlines with dates, written as YYYY-MM-DD (for example 2026-11-28).
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

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Turns a written date into "YYYY-MM-DD" when it clearly includes the year:
 * "2026-11-28", "Nov 28, 2026", "November 28 2026", "28 Nov 2026", "11/28/2026".
 * Returns null otherwise, so a date without a year is dropped instead of guessed.
 */
export function normalizeDate(value: string): string | null {
  const text = value.trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) => {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    return isRealDate(iso) ? iso : null;
  };
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return build(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (m) return build(+m[3], +m[1], +m[2]);
  m = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(text);
  if (m) {
    const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return month >= 0 ? build(+m[3], month + 1, +m[2]) : null;
  }
  m = /^(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/i.exec(text);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return month >= 0 ? build(+m[3], month + 1, +m[1]) : null;
  }
  return null;
}

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
    const date = isRecord(d) && typeof d.date === "string" ? normalizeDate(d.date) : null;
    if (isRecord(d) && isNonEmptyString(d.title) && date) {
      deadlines.push({ title: d.title.trim(), date });
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
