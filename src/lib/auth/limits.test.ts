import { describe, expect, it } from "vitest";
import { ipHeaders, SIGN_IN_LIMITS } from "./limits";

describe("sign-in limits", () => {
  it("give more room than 3 per 10 seconds, and more for Google than for passwords", () => {
    const perMinute = (path: string) => (SIGN_IN_LIMITS[path].max * 60) / SIGN_IN_LIMITS[path].window;
    expect(perMinute("/sign-in/social")).toBeGreaterThan(perMinute("/sign-in/email"));
    expect(perMinute("/sign-in/email")).toBeGreaterThanOrEqual(10);
    expect(perMinute("/sign-in/email")).toBeLessThanOrEqual(20);
  });
});

describe("ipHeaders", () => {
  it("reads Vercel's own headers first on Vercel", () => {
    expect(ipHeaders({ VERCEL: "1" })).toEqual(["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"]);
  });
  it("keeps the library default elsewhere", () => {
    expect(ipHeaders({})).toBeUndefined();
  });
});
