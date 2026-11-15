import { describe, expect, it } from "vitest";
import { loginCopy, signInErrorText } from "./loginCopy";

describe("loginCopy", () => {
  it("matches the design for each side", () => {
    expect(loginCopy("user", false)).toMatchObject({ cta: "Sign in", tagline: "Helping you do more on your own." });
    expect(loginCopy("guardian", false)).toMatchObject({
      cta: "Sign in as parent / guardian",
      footerLink: "Create a guardian account",
    });
  });
  it("switches to creating an account", () => {
    expect(loginCopy("user", true).cta).toBe("Create account");
    expect(loginCopy("guardian", true).cta).toBe("Create guardian account");
    expect(loginCopy("user", true).footerLink).toBe("Sign in");
  });
});

describe("signInErrorText", () => {
  it("never says whether the email or the password was wrong", () => {
    expect(signInErrorText({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }, false)).toBe(
      "That email or password didn't match. Try again.",
    );
  });
  it("explains sign-up problems plainly", () => {
    expect(signInErrorText({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }, true)).toMatch(/already has an account/);
    expect(signInErrorText({ code: "PASSWORD_TOO_SHORT" }, true)).toMatch(/8 characters/);
  });
  it("asks to wait when rate limited", () => {
    expect(signInErrorText({ status: 429 }, false)).toMatch(/Wait a minute/);
  });
});
