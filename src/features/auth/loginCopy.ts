// The words on the login page, from the design. Plain logic so it's easy to test.

import type { Role } from "@/lib/auth/roles";

export interface LoginCopy {
  tagline: string;
  heading: string;
  sub: string;
  emailHint: string;
  cta: string;
  footer: string;
  footerLink: string;
}

export function loginCopy(role: Role, creating: boolean): LoginCopy {
  if (role === "guardian") {
    return {
      tagline: "Support without taking over.",
      heading: creating ? "Create a guardian account" : "Sign in to support someone",
      sub: "See how the day is going, add routines, and manage trusted contacts.",
      emailHint: "sam@example.com",
      cta: creating ? "Create guardian account" : "Sign in as parent / guardian",
      footer: creating ? "Already have an account?" : "Setting Bridge up for someone?",
      footerLink: creating ? "Sign in" : "Create a guardian account",
    };
  }
  return {
    tagline: "One step at a time.",
    heading: creating ? "Make your Bridge account" : "Welcome back",
    sub: creating ? "Use your email and a password you'll remember." : "Sign in to see today's routines.",
    emailHint: "jordan@example.com",
    cta: creating ? "Create account" : "Sign in",
    footer: creating ? "Already have an account?" : "New to Bridge?",
    footerLink: creating ? "Sign in" : "Create an account",
  };
}

/** A short, kind message for a failed sign-in or sign-up. Never says which part was wrong. */
export function signInErrorText(error: { code?: string; status?: number }, creating: boolean): string {
  const code = error.code ?? "";
  if (creating) {
    if (code.includes("ALREADY_EXISTS")) return "That email already has an account. Tap Sign in below.";
    if (code.includes("PASSWORD_TOO_SHORT")) return "Your password needs at least 8 characters.";
    if (code.includes("INVALID_EMAIL")) return "That email doesn't look right. Check it and try again.";
  }
  if (error.status === 429) return "Too many tries. Wait a minute, then try again.";
  if (creating) return "We couldn't make the account. Try again.";
  return "That email or password didn't match. Try again.";
}
