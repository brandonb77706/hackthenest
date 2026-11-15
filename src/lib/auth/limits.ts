// How often people can try to sign in, and how login finds who is asking.
// Plain logic, so it's easy to test. Limits only apply in production.

type Env = Record<string, string | undefined>;

export interface RateRule {
  /** Seconds */
  window: number;
  max: number;
}

/**
 * Per visitor (by IP address). The library's default is 3 sign-ins per
 * 10 seconds, which a few people on the same wifi (a demo, a classroom)
 * hit together. Google sign-in has no password to guess, so it gets more room.
 */
export const SIGN_IN_LIMITS: Record<string, RateRule> = {
  "/sign-in/social": { window: 60, max: 30 },
  "/sign-in/email": { window: 60, max: 10 },
  "/sign-up/email": { window: 60, max: 10 },
};

/**
 * Headers that hold the visitor's IP address. On Vercel these are set by
 * Vercel itself (a visitor can't fake them). Without a usable header, every
 * visitor would share one limit.
 */
export function ipHeaders(env: Env): string[] | undefined {
  return env.VERCEL ? ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] : undefined;
}
