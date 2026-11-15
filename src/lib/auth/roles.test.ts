import { describe, expect, it } from "vitest";
import { homeFor, placeholderName, safeNext, signUpRole, toRole } from "./roles";

describe("signUpRole", () => {
  it("uses the side picked before Google sign-up", () => {
    expect(signUpRole("user", "guardian")).toBe("guardian");
    expect(signUpRole(undefined, "guardian")).toBe("guardian");
  });
  it("uses the email form's role when there was no Google sign-in", () => {
    expect(signUpRole("guardian", undefined)).toBe("guardian");
    expect(signUpRole("user", undefined)).toBe("user");
  });
  it("never grants anything but user or guardian", () => {
    expect(signUpRole("user", "admin")).toBe("user");
    expect(signUpRole("admin", undefined)).toBe("user");
  });
});

describe("toRole", () => {
  it("keeps guardian", () => expect(toRole("guardian")).toBe("guardian"));
  it("treats anything else as a user", () => {
    for (const v of ["user", "admin", "", null, undefined, 1]) expect(toRole(v)).toBe("user");
  });
});

describe("homeFor", () => {
  it("sends users to Today and guardians to the guardian view", () => {
    expect(homeFor("user")).toBe("/");
    expect(homeFor("guardian")).toBe("/guardian");
  });
});

describe("safeNext", () => {
  it("allows paths on this site", () => {
    expect(safeNext("/me")).toBe("/me");
    expect(safeNext("/routines/abc/edit?x=1")).toBe("/routines/abc/edit?x=1");
  });
  it("blocks other sites and loops back to login", () => {
    for (const v of ["https://evil.com", "//evil.com", "/\\evil.com", "evil", "/login", "/login?next=/", "/api/today", "", null, undefined]) {
      expect(safeNext(v)).toBeNull();
    }
  });
});

describe("placeholderName", () => {
  it("uses the start of the email until the user picks a name", () => {
    expect(placeholderName("jordan@example.com")).toBe("Jordan");
    expect(placeholderName("sam.lee42@example.com")).toBe("Sam lee");
    expect(placeholderName("1234@example.com")).toBe("Friend");
  });
});
