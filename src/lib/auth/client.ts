"use client";

// Better Auth in the browser: sign in, sign up, sign out.
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "./server";

// No baseURL: calls go to /api/auth on whatever host served the page
// (localhost, a phone on wifi, or a tunnel).
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});
