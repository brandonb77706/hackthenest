import { describe, expect, it } from "vitest";
import { ALL_ALLOWED, editRules, lockedText, onlySharingChanged } from "./editRules";

const link = (guardianName: string, routines = true, contacts = true) => ({
  guardianName,
  user_can_edit_routines: routines,
  user_can_edit_contacts: contacts,
});

describe("editRules", () => {
  it("allows everything with no guardian, or when guardians leave it on", () => {
    expect(editRules([])).toEqual(ALL_ALLOWED);
    expect(editRules([link("Sam")])).toEqual(ALL_ALLOWED);
  });

  it("is off when any guardian turns it off", () => {
    const rules = editRules([link("Sam", false), link("Alex")]);
    expect(rules.routines).toEqual({ allowed: false, managedBy: ["Sam"] });
    expect(rules.contacts).toEqual({ allowed: true, managedBy: [] });
  });
});

describe("lockedText", () => {
  it("names who to ask", () => {
    expect(lockedText("routines", { allowed: false, managedBy: ["Sam"] })).toBe("Sam manages your routines. Ask Sam to make changes.");
    expect(lockedText("contacts", { allowed: false, managedBy: ["Sam", "Alex"] })).toBe(
      "Sam and Alex manage your trusted contacts. Ask them to make changes.",
    );
  });
});

it("onlySharingChanged ignores the sharing switches", () => {
  const c = { name: "Maria", method: "sms", contact: "+1555", relation: "Aunt" };
  expect(onlySharingChanged(c, { ...c })).toBe(true);
  expect(onlySharingChanged(c, { ...c, contact: "+1666" })).toBe(false);
  expect(onlySharingChanged(c, { ...c, name: "Mia" })).toBe(false);
});
