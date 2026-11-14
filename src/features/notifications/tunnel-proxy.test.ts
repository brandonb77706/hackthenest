import { describe, expect, it } from "vitest";
import { allowedTunnelRequest } from "./tunnel-proxy.mjs";

describe("test tunnel isolation", () => {
  it.each(["/notifications/test", "/notifications/sw.js", "/_next/static/chunks/test.js", "/favicon.ico"])("allows test asset %s", (path) => {
    expect(allowedTunnelRequest("GET", path)).toBe(true);
  });
  it.each(["/api/routines", "/api/speak", "/routines", "/.env", "/_next/image?url=/api/routines", "/_next/static/%2e%2e%2fsecret", "/_next/static/%5csecret"])("blocks unrelated path %s", (path) => {
    expect(allowedTunnelRequest("GET", path)).toBe(false);
  });
  it("blocks writes even to the test page", () => {
    expect(allowedTunnelRequest("POST", "/notifications/test")).toBe(false);
  });
});
