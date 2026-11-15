// Better Auth, server side. Accounts, sessions and Google links are stored in
// MongoDB (collections: user, session, account, verification), next to the app data.
// A user's id is a MongoDB ObjectId, so it fits every `user_id` field as is.
//
// Lazy: nothing connects until the first auth request, so `npm run build`
// works without MONGODB_URI.

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { toRole } from "./roles";
import { ipHeaders, SIGN_IN_LIMITS } from "./limits";
import { authUrls } from "./siteUrl";

function createAuth() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Login needs the database (see .env.example).");
  // The driver connects on the first query, so creating the client is cheap.
  const client = new MongoClient(uri);
  const db = client.db(process.env.MONGODB_DB || "bridge");

  const google =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : undefined;

  // Which addresses login trusts: BETTER_AUTH_URL, Vercel's own addresses, or dev ones.
  const urls = authUrls(process.env);

  return betterAuth({
    appName: "Bridge",
    database: mongodbAdapter(db, { client }),
    baseURL: urls.baseURL,
    trustedOrigins: urls.trustedOrigins,
    advanced: {
      trustedProxyHeaders: urls.trustProxyHeaders,
      // Who is asking, so each visitor gets their own sign-in limit.
      ipAddress: { ipAddressHeaders: ipHeaders(process.env) },
    },
    rateLimit: { customRules: SIGN_IN_LIMITS },
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
    socialProviders: google ? { google } : {},
    session: {
      // Stay signed in for 30 days; refresh the date once a day of use.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: true },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Only "user" or "guardian", whatever the sign-up form sent.
          before: async (user) => ({ data: { ...user, role: toRole(user.role) } }),
        },
      },
    },
    // Sets cookies from server actions too. Must be the last plugin.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

// One instance per server, also across Turbopack's separate module copies.
const cache = globalThis as unknown as { bridgeAuth?: Auth };

export function getAuth(): Auth {
  return (cache.bridgeAuth ??= createAuth());
}

/** True when Google sign-in has keys, so the login page can hide the button otherwise. */
export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
