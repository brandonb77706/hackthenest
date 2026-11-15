import { describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));

import { getCurrentUserId } from "./currentUser";

describe("getCurrentUserId", () => {
  it("is the signed-in user's id", async () => {
    requireUser.mockResolvedValue({ id: "64b0000000000000000000aa", name: "Jordan", email: "j@x.com", role: "user" });
    await expect(getCurrentUserId()).resolves.toBe("64b0000000000000000000aa");
  });

  it("passes on the redirect to login when nobody is signed in", async () => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(getCurrentUserId()).rejects.toThrow("NEXT_REDIRECT");
  });
});
