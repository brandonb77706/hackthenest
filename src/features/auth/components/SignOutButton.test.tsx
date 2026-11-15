import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn(async () => ({ data: { success: true }, error: null }));
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut: () => signOut() } }));

import { SignOutButton } from "./SignOutButton";

describe("SignOutButton", () => {
  it("signs out and goes to the login page", async () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
