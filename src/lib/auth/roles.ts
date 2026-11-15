// Who an account is for. A "user" uses Bridge for their own day; a "guardian"
// (parent, aide, job coach) supports someone else. Plain logic so it's easy to test.

export const ROLES = ["user", "guardian"] as const;
export type Role = (typeof ROLES)[number];

/** Anything that isn't "guardian" is a regular user, so a bad value never grants more. */
export function toRole(value: unknown): Role {
  return value === "guardian" ? "guardian" : "user";
}

/**
 * The role a new account gets. Email sign-up sends it with the form. Google
 * sign-up can't, so the login page passes it through the Google sign-in
 * (`oauthRole`), and that wins when present. Only ever "user" or "guardian".
 */
export function signUpRole(formRole: unknown, oauthRole: unknown): Role {
  return toRole(oauthRole ?? formRole);
}

/** Where to go after signing in. The guardian view comes in a later step. */
export function homeFor(role: Role): string {
  return role === "guardian" ? "/guardian" : "/";
}

/**
 * A safe place to return to after login: only paths on this site, never
 * another site (`//evil.com`, `https://...`) and never back to /login.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/api/")) return null;
  return next;
}

/** Sign-up needs a name, but Bridge asks "What should we call you?" after login. */
export function placeholderName(email: string): string {
  const local = email.split("@")[0]?.replace(/[^a-zA-Z]+/g, " ").trim() ?? "";
  if (!local) return "Friend";
  return local.charAt(0).toUpperCase() + local.slice(1);
}
