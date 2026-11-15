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

// Hosts allowed to serve the login page in dev: this computer, phones on the
// same wifi, and the tunnels in next.config.ts. Deployed, set BETTER_AUTH_URL.
const DEV_HOSTS = [
  "localhost:*",
  "127.0.0.1:*",
  "10.*",
  "192.168.*",
  "172.*",
  "*.trycloudflare.com",
  "*.devtunnels.ms",
];

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

  const dev = process.env.NODE_ENV !== "production";

  return betterAuth({
    appName: "Bridge",
    database: mongodbAdapter(db, { client }),
    baseURL: process.env.BETTER_AUTH_URL || { allowedHosts: DEV_HOSTS, fallback: "http://localhost:3000" },
    trustedOrigins: dev ? DEV_HOSTS.flatMap((host) => [`http://${host}`, `https://${host}`]) : undefined,
    advanced: { trustedProxyHeaders: dev },
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
