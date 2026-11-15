import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isPublicPath, proxy } from "./proxy";

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

describe("proxy", () => {
  it("lets the login page and auth API through", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/sign-in/email")).toBe(true);
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/me")).toBe(false);
  });

  it("sends signed-out visitors to login and remembers where they were going", () => {
    const res = proxy(req("/routines?tab=all"));
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("next")).toBe("/routines?tab=all");
  });

  it("answers signed-out API calls with 401, not a redirect", async () => {
    const res = proxy(req("/api/today"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Please sign in." });
  });

  it("lets visitors with a session cookie through", () => {
    const res = proxy(req("/me", "better-auth.session_token=abc.def"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });
});
