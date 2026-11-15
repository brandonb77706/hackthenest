import { describe, expect, it } from "vitest";
import { authUrls, DEV_HOSTS, vercelHosts } from "./siteUrl";

const onVercel = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_PROJECT_PRODUCTION_URL: "hackthenest-one.vercel.app",
  VERCEL_BRANCH_URL: "hackthenest-git-main-brandon.vercel.app",
  VERCEL_URL: "hackthenest-abc123-brandon.vercel.app",
};

describe("authUrls", () => {
  it("uses BETTER_AUTH_URL when it's set, without a trailing slash", () => {
    expect(authUrls({ ...onVercel, BETTER_AUTH_URL: "https://bridge.example.com/ " }).baseURL).toBe("https://bridge.example.com");
  });

  it("on Vercel without BETTER_AUTH_URL, trusts Vercel's own addresses, production first", () => {
    const urls = authUrls(onVercel);
    expect(urls.baseURL).toEqual({
      allowedHosts: ["hackthenest-one.vercel.app", "hackthenest-git-main-brandon.vercel.app", "hackthenest-abc123-brandon.vercel.app"],
      fallback: "https://hackthenest-one.vercel.app",
      protocol: "https",
    });
    expect(urls.trustedOrigins).toContain("https://hackthenest-one.vercel.app");
    expect(urls.trustProxyHeaders).toBe(false);
  });

  it("never falls back to localhost on Vercel (that sent Google sign-in to localhost)", () => {
    expect(JSON.stringify(authUrls(onVercel))).not.toContain("localhost");
  });

  it("in dev, trusts this computer, wifi and tunnels", () => {
    const urls = authUrls({ NODE_ENV: "development" });
    expect(urls.baseURL).toEqual({ allowedHosts: DEV_HOSTS, fallback: "http://localhost:3000" });
    expect(urls.trustedOrigins).toContain("http://localhost:*");
    expect(urls.trustProxyHeaders).toBe(true);
  });
});

describe("vercelHosts", () => {
  it("is empty off Vercel, and cleans up and de-duplicates the addresses", () => {
    expect(vercelHosts({ VERCEL_URL: "x.vercel.app" })).toEqual([]);
    expect(vercelHosts({ VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "https://a.vercel.app/", VERCEL_URL: "a.vercel.app" })).toEqual(["a.vercel.app"]);
  });
});
