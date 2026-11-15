import { describe, expect, it } from "vitest";
import { checkContact, cleanPhone, readContactInput, type ContactInput } from "./contactInput";

const valid = (): ContactInput => ({
  name: "Sam",
  method: "sms",
  contact: "(555) 010-0142",
  relation: "Your brother",
  can_see_routines: false,
  can_get_lost_alerts: false,
  can_get_stuck_alerts: false,
});

describe("cleanPhone", () => {
  it("keeps digits and a leading plus", () => {
    expect(cleanPhone("(555) 010-0142")).toBe("5550100142");
    expect(cleanPhone("+1 555 010 0142")).toBe("+15550100142");
  });
});

describe("checkContact", () => {
  it("accepts a phone contact and cleans the number", () => {
    const result = checkContact(valid());
    expect(result).toEqual({ ok: true, value: { ...valid(), contact: "5550100142" } });
  });

  it("needs a name and a way to reach them", () => {
    const noName = checkContact({ ...valid(), name: "  " });
    expect(!noName.ok && noName.errors.name).toMatch(/name/);
    const noPhone = checkContact({ ...valid(), contact: "12" });
    expect(!noPhone.ok && noPhone.errors.contact).toMatch(/phone number/);
    const badEmail = checkContact({ ...valid(), method: "email", contact: "sam at example" });
    expect(!badEmail.ok && badEmail.errors.contact).toMatch(/email/);
    expect(checkContact({ ...valid(), method: "email", contact: "sam@example.com" }).ok).toBe(true);
    expect(checkContact({ ...valid(), method: "telegram", contact: "@sam" }).ok).toBe(true);
  });

  it("keeps sharing settings only when they're exactly true", () => {
    const result = checkContact({ ...valid(), can_get_lost_alerts: true, can_see_routines: "yes" as unknown as boolean });
    expect(result.ok && result.value).toMatchObject({ can_get_lost_alerts: true, can_see_routines: false });
  });
});

describe("readContactInput", () => {
  it("reads a body with sharing off by default", () => {
    expect(readContactInput({ name: "Sam", method: "sms", contact: "555" })).toEqual({
      name: "Sam",
      method: "sms",
      contact: "555",
      relation: "",
      can_see_routines: false,
      can_get_lost_alerts: false,
      can_get_stuck_alerts: false,
    });
  });

  it("rejects bodies with the wrong shape", () => {
    expect(readContactInput(null)).toBeNull();
    expect(readContactInput({ name: "Sam", method: "fax", contact: "1" })).toBeNull();
    expect(readContactInput({ name: 5, method: "sms", contact: "1" })).toBeNull();
  });
});
