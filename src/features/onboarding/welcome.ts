// Welcome, the first screens after signing up: name and Buddy.
// (Colors are on Me for now.)
// Plain rules, no database and no UI, so they are easy to test.

import { placeholderName } from "@/lib/auth/roles";

export const NAME_MAX = 30;

/** A name as typed, tidied up. Null when nothing usable is left. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  return name.slice(0, NAME_MAX).trim();
}

/**
 * The name to show in the box at first. A name a guardian already gave, or the
 * one from Google. Not the placeholder made from the email at sign-up.
 */
export function suggestedName(input: { profileName?: string | null; accountName?: string | null; email: string }): string {
  const profile = cleanName(input.profileName);
  if (profile && profile !== "Friend") return profile;
  const account = cleanName(input.accountName);
  if (account && account !== placeholderName(input.email)) return account;
  return "";
}

export function needsWelcome(profile: { onboarded?: boolean } | null): boolean {
  return profile?.onboarded !== true;
}

export interface WelcomeInput {
  name: string;
  avatar_id: string;
}

/** Checks what Welcome sends. Messages are plain so the screen can show them. */
export function parseWelcomeInput(body: unknown): { ok: true; value: WelcomeInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = cleanName(b.name);
  if (!name) return { ok: false, error: "Please type your name." };
  if (typeof b.avatar_id !== "string" || !b.avatar_id) return { ok: false, error: "Please pick a Buddy." };
  return { ok: true, value: { name, avatar_id: b.avatar_id } };
}
