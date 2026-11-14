// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectDB } from "./connect";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("connectDB", () => {
  it("explains what to do when MONGODB_URI is missing", () => {
    vi.stubEnv("MONGODB_URI", "");
    expect(() => connectDB()).toThrow(/MONGODB_URI is not set.*\.env\.local/);
  });
});
