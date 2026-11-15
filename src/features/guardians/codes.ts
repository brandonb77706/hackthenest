// Setup codes that link a user and a guardian. Plain rules, no database, so
// they are easy to test.
//
// Either side can make a code; the other side enters it:
// - A guardian sets up Bridge for someone and gives them the code.
// - A user taps "Add a guardian" on Me and gives the code to their guardian.

import type { ID, SetupCode, SetupCodeFrom } from "@/lib/types";

/** No 0/O, 1/I/L, so a code read out loud or off a screen can't be mixed up. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 24 * 60 * 60 * 1000;

/** A random code like "K7P2QX". */
export function makeCode(randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  let code = "";
  // Rejection sampling keeps every letter equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte < limit && code.length < CODE_LENGTH) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

/** "k7p 2qx" or "K7P-2QX" becomes "K7P2QX". Null if it can't be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** "K7P2QX" shown as "K7P 2QX", easier to read and type. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** The side that enters a code made by `from`. */
export function otherSide(from: SetupCodeFrom): SetupCodeFrom {
  return from === "user" ? "guardian" : "user";
}

export type RedeemProblem = "not_found" | "expired" | "used" | "own_code" | "wrong_side";

type CodeFacts = Pick<SetupCode, "from_role" | "created_by" | "expires_at" | "used_at">;

/** Whether this person can use this code right now. */
export function checkRedeem(
  code: CodeFacts | null,
  redeemer: { id: ID; role: SetupCodeFrom },
  now: Date = new Date(),
): { ok: true } | { ok: false; problem: RedeemProblem } {
  if (!code) return { ok: false, problem: "not_found" };
  if (code.created_by === redeemer.id) return { ok: false, problem: "own_code" };
  if (code.used_at) return { ok: false, problem: "used" };
  if (new Date(code.expires_at).getTime() <= now.getTime()) return { ok: false, problem: "expired" };
  if (redeemer.role !== otherSide(code.from_role)) return { ok: false, problem: "wrong_side" };
  return { ok: true };
}

/** Who is the user and who is the guardian once a code is used. */
export function linkSides(code: Pick<SetupCode, "from_role" | "created_by">, redeemerId: ID): { user_id: ID; guardian_id: ID } {
  return code.from_role === "user"
    ? { user_id: code.created_by, guardian_id: redeemerId }
    : { user_id: redeemerId, guardian_id: code.created_by };
}

/** Plain words for each problem, shown on screen. */
export function redeemProblemText(problem: RedeemProblem | "bad_format", role: SetupCodeFrom): string {
  switch (problem) {
    case "bad_format":
      return `Codes have ${CODE_LENGTH} letters and numbers. Check it and try again.`;
    case "not_found":
      return "We couldn't find that code. Check it and try again.";
    case "expired":
      return "That code is too old. Ask for a new one.";
    case "used":
      return "That code was already used. Ask for a new one.";
    case "own_code":
      return "That's your own code. Give it to the other person to enter.";
    case "wrong_side":
      return role === "guardian"
        ? "That code is for the person using Bridge. Ask them for the code from their Me tab."
        : "That code is for a guardian. Give it to your guardian to enter.";
  }
}

/** "Works for 24 more hours", "Works for 1 more hour", "Works for a few more minutes". */
export function expiresText(expiresAt: string, now: Date = new Date()): string {
  const hours = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / (60 * 60 * 1000));
  if (hours >= 2) return `Works once, for ${hours} more hours.`;
  if (hours === 1) return "Works once, for 1 more hour.";
  return "Works once, for a few more minutes.";
}
