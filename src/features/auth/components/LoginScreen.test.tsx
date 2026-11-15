import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

const signInEmail = vi.fn();
const signUpEmail = vi.fn();
const signInSocial = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: (a: unknown) => signInEmail(a), social: (a: unknown) => signInSocial(a) },
    signUp: { email: (a: unknown) => signUpEmail(a) },
  },
}));

import { LoginScreen } from "./LoginScreen";

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

beforeEach(() => {
  search = "";
  vi.clearAllMocks();
});

describe("LoginScreen", () => {
  it("signs in with email and goes to Today", async () => {
    signInEmail.mockResolvedValue({ data: { user: { role: "user" } }, error: null });
    render(<LoginScreen google />);
    fill("jordan@example.com", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(signInEmail).toHaveBeenCalledWith({ email: "jordan@example.com", password: "secret123" });
  });

  it("goes back to where the visitor was headed", async () => {
    search = "next=/me";
    signInEmail.mockResolvedValue({ data: { user: { role: "user" } }, error: null });
    render(<LoginScreen google />);
    fill("jordan@example.com", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/me"));
  });

  it("shows a kind error and stays on the page", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 } });
    render(<LoginScreen google />);
    fill("jordan@example.com", "wrong-pass");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That email or password didn't match");
    expect(replace).not.toHaveBeenCalled();
  });

  it("creates a guardian account from the Parent / guardian side", async () => {
    signUpEmail.mockResolvedValue({ data: { user: { role: "guardian" } }, error: null });
    render(<LoginScreen google />);
    fireEvent.click(screen.getByRole("tab", { name: "Parent / guardian" }));
    expect(screen.getByRole("tab", { name: "Parent / guardian" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Create a guardian account" }));
    fill("sam@example.com", "longenough");
    fireEvent.click(screen.getByRole("button", { name: "Create guardian account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/guardian"));
    expect(signUpEmail).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "longenough",
      name: "Sam",
      role: "guardian",
    });
  });

  it("hides Google when it isn't set up", () => {
    render(<LoginScreen google={false} />);
    expect(screen.queryByRole("button", { name: /Google/ })).toBeNull();
  });

  it("starts Google sign-in", () => {
    signInSocial.mockResolvedValue({ data: {}, error: null });
    render(<LoginScreen google />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    expect(signInSocial).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", callbackURL: "/" }));
  });
});
