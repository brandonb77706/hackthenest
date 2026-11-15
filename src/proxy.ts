// Sends signed-out visitors to the login page before anything renders.
// This only checks that a session cookie exists (fast, no database). Pages and
// API routes still check the session for real through getCurrentUserId().

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Open without signing in.
const PUBLIC_PATHS = ["/login", "/api/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname) || getSessionCookie(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Please sign in." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next.js files, images, and files in public/ (anything with a dot).
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
