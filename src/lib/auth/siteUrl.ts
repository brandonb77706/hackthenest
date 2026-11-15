// Which addresses login trusts. Plain logic, so it's easy to test.
//
// 1. BETTER_AUTH_URL, when set, is the one address (a custom domain, say).
// 2. On Vercel, the addresses Vercel gives the app: the production one
//    (hackthenest-one.vercel.app) and each deploy's own preview address.
//    Vercel sets these itself, so nothing needs adding by hand.
// 3. Otherwise (npm run dev): this computer, phones on the same wifi, tunnels.

type Env = Record<string, string | undefined>;

// Hosts allowed to serve the login page in dev: this computer, phones on the
// same wifi, and the tunnels in next.config.ts.
export const DEV_HOSTS = [
  "localhost:*",
  "127.0.0.1:*",
  "10.*",
  "192.168.*",
  "172.*",
  "*.trycloudflare.com",
  "*.devtunnels.ms",
];

export interface AuthUrls {
  baseURL: string | { allowedHosts: string[]; fallback: string; protocol?: "https" | "http" | "auto" };
  /** Extra origins allowed to sign in (the base URL is always allowed) */
  trustedOrigins?: string[];
  /** Read the host and protocol from proxy headers (dev tunnels only) */
  trustProxyHeaders: boolean;
}

/** Vercel's addresses for this deploy, without "https://", production first. */
export function vercelHosts(env: Env): string[] {
  if (!env.VERCEL) return [];
  const hosts = [env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_BRANCH_URL, env.VERCEL_URL]
    .map((h) => h?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
    .filter((h): h is string => Boolean(h));
  return [...new Set(hosts)];
}

export function authUrls(env: Env): AuthUrls {
  const dev = env.NODE_ENV !== "production";
  const devOrigins = DEV_HOSTS.flatMap((host) => [`http://${host}`, `https://${host}`]);
  const explicit = env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "");

  if (explicit) {
    return { baseURL: explicit, trustedOrigins: dev ? devOrigins : undefined, trustProxyHeaders: dev };
  }

  const vercel = vercelHosts(env);
  if (vercel.length > 0) {
    return {
      baseURL: { allowedHosts: vercel, fallback: `https://${vercel[0]}`, protocol: "https" },
      trustedOrigins: vercel.map((h) => `https://${h}`),
      trustProxyHeaders: false,
    };
  }

  return {
    baseURL: { allowedHosts: DEV_HOSTS, fallback: "http://localhost:3000" },
    trustedOrigins: dev ? devOrigins : undefined,
    trustProxyHeaders: dev,
  };
}
