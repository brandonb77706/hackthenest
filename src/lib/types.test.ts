import { describe, expect, it } from "vitest";
import { DEFAULT_CONTACT_PERMISSIONS } from "./types";

describe("DEFAULT_CONTACT_PERMISSIONS", () => {
  it("has every sharing setting off", () => {
    expect(Object.values(DEFAULT_CONTACT_PERMISSIONS).every((v) => v === false)).toBe(true);
  });

  it("can't be changed by accident", () => {
    expect(Object.isFrozen(DEFAULT_CONTACT_PERMISSIONS)).toBe(true);
  });
});
