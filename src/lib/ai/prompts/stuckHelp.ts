// Stuck help (owner: George). Source: docs/ai-prompts.md section 3.

import { fail, fillTemplate, isNonEmptyString, isRecord, ok, type ParseResult } from "./parse";

export interface StuckHelpResponse {
  reply: string;
  emergency: boolean;
  offer_contact: boolean;
}

const TEMPLATE = `You are Bridge, a calm helper. The person is stuck on this step: {step_text}
They said: {user_message}
This is try number {attempt} on this step.

Rules:
- Use short, calm sentences.
- Give one small action at a time, then wait.
- Never give medical or legal advice.
- You are an AI. Never say you are a person.
- If they mention danger, being hurt, wanting to hurt themselves, or an emergency, tell them to call 911, or call or text 988, and set "emergency": true.
- If they are still stuck after two tries, set "offer_contact": true.

Return JSON only.`;

/** `attempt` starts at 1. The AI needs it to know when to offer a trusted contact. */
export function buildStuckHelpPrompt(input: { stepText: string; userMessage: string; attempt: number }): string {
  return fillTemplate(TEMPLATE, {
    step_text: input.stepText.trim(),
    user_message: input.userMessage.trim(),
    attempt: input.attempt,
  });
}

export const stuckHelpSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    emergency: { type: "boolean" },
    offer_contact: { type: "boolean" },
  },
  required: ["reply", "emergency", "offer_contact"],
} as const;

export function parseStuckHelp(raw: unknown): ParseResult<StuckHelpResponse> {
  if (!isRecord(raw)) return fail("Response is not an object");
  if (!isNonEmptyString(raw.reply)) return fail("Missing reply");
  if (typeof raw.emergency !== "boolean") return fail("Missing emergency");
  if (typeof raw.offer_contact !== "boolean") return fail("Missing offer_contact");
  return ok({ reply: raw.reply.trim(), emergency: raw.emergency, offer_contact: raw.offer_contact });
}
