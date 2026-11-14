// "Help me say this" for speak for me (owner: George). Source: docs/ai-prompts.md section 5.
// Uses generateText, not JSON.

import { fail, fillTemplate, isNonEmptyString, ok, type ParseResult } from "./parse";

const TEMPLATE = `Turn this into one clear, polite sentence the person can play out loud to someone nearby: {text}
Keep their meaning. Don't add facts. Return only the sentence.`;

export function buildSpeakForMePrompt(input: { text: string }): string {
  return fillTemplate(TEMPLATE, { text: input.text.trim() });
}

/** Cleans up the AI's sentence: trims it and removes wrapping quotes. */
export function parseSpeakForMe(raw: unknown): ParseResult<string> {
  if (!isNonEmptyString(raw)) return fail("Empty response");
  const sentence = raw.trim().replace(/^["“']([\s\S]*)["”']$/, "$1").trim();
  return sentence ? ok(sentence) : fail("Empty response");
}
