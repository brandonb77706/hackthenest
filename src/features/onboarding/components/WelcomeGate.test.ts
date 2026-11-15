// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
const requireUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
const userNeedsWelcome = vi.fn();
vi.mock("../service", () => ({ userNeedsWelcome: (id: string) => userNeedsWelcome(id) }));

import { WelcomeGate } from "./WelcomeGate";

beforeEach(() => vi.clearAllMocks());

describe("WelcomeGate", () => {
  it("sends a new user to Welcome", async () => {
    requireUser.mockResolvedValue({ id: "u1", role: "user" });
    userNeedsWelcome.mockResolvedValue(true);
    await expect(WelcomeGate()).rejects.toThrow("REDIRECT /welcome");
    expect(userNeedsWelcome).toHaveBeenCalledWith("u1");
  });

  it("lets a user who finished Welcome stay", async () => {
    requireUser.mockResolvedValue({ id: "u1", role: "user" });
    userNeedsWelcome.mockResolvedValue(false);
    await expect(WelcomeGate()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends a guardian to the guardian view", async () => {
    requireUser.mockResolvedValue({ id: "g1", role: "guardian" });
    await expect(WelcomeGate()).rejects.toThrow("REDIRECT /guardian");
    expect(userNeedsWelcome).not.toHaveBeenCalled();
  });
});
