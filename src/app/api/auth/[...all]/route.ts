import { getAuth } from "@/lib/auth/server";

// Every Better Auth endpoint: /api/auth/sign-in/email, /api/auth/sign-out,
// /api/auth/callback/google, /api/auth/get-session, and so on.
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
