import { describe, expect, it } from "vitest";
import { DEFAULT_CONTACT_PERMISSIONS } from "@/lib/types";
import {
  LOST_STEPS,
  buildLostMessage,
  buildMapsLink,
  formatCoord,
  isValidCoords,
  lostAlertRecipients,
} from "./lostMode";

describe("LOST_STEPS", () => {
  it("are the three calm steps from the prompt, in order", () => {
    expect(LOST_STEPS).toEqual(["Stay where you are.", "Find a safe place to sit.", "Help is coming."]);
  });
});

// A real spot we can reuse in every test.
const coords = { latitude: 40.7128, longitude: -74.006 };

// describe() groups tests for one function.
describe("isValidCoords", () => {
  // it() is one test. Read it as a sentence: "it accepts real coordinates".
  it("accepts real coordinates", () => {
    // expect(actual).toBe(expected) fails the test if they differ.
    expect(isValidCoords(coords)).toBe(true);
  });

  // Users can be anywhere, so check every hemisphere, not just one.
  it.each([
    ["New York (north, west)", 40.7128, -74.006],
    ["Sydney (south, east)", -33.8688, 151.2093],
    ["Buenos Aires (south, west)", -34.6037, -58.3816],
    ["Tokyo (north, east)", 35.6762, 139.6503],
    ["0, 0 (allowed on purpose)", 0, 0],
  ])("accepts %s", (_name: string, latitude: number, longitude: number) => {
    expect(isValidCoords({ latitude, longitude })).toBe(true);
  });

  // The exact edges are real places (the poles and the date line), so they must pass.
  it.each([
    [90, 0],
    [-90, 0],
    [0, 180],
    [0, -180],
  ])("accepts the exact edge %d, %d", (latitude: number, longitude: number) => {
    expect(isValidCoords({ latitude, longitude })).toBe(true);
  });

  it("rejects values just past the edges", () => {
    expect(isValidCoords({ latitude: 90.000001, longitude: 0 })).toBe(false);
    expect(isValidCoords({ latitude: -90.000001, longitude: 0 })).toBe(false);
    expect(isValidCoords({ latitude: 0, longitude: 180.000001 })).toBe(false);
    expect(isValidCoords({ latitude: 0, longitude: -180.000001 })).toBe(false);
  });

  it("rejects latitude or longitude outside the Earth's range", () => {
    expect(isValidCoords({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoords({ latitude: 0, longitude: 181 })).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isValidCoords({ latitude: NaN, longitude: 0 })).toBe(false);
    expect(isValidCoords({ latitude: 0, longitude: Infinity })).toBe(false);
  });

  it("rejects null and undefined (no reading at all)", () => {
    expect(isValidCoords(null)).toBe(false);
    expect(isValidCoords(undefined)).toBe(false);
  });
});

describe("lostAlertRecipients", () => {
  it("includes only contacts with lost alerts turned on", () => {
    const contacts = [
      { name: "Mom", can_get_lost_alerts: true },
      { name: "Friend", can_get_lost_alerts: false },
      { name: "Coach", can_get_lost_alerts: true },
    ];
    expect(lostAlertRecipients(contacts).map((c) => c.name)).toEqual(["Mom", "Coach"]);
  });

  // Required safety test: every sharing setting starts off, so a new contact gets nothing.
  it("sends nothing to a contact who still has the default settings", () => {
    const newContact = { name: "New contact", ...DEFAULT_CONTACT_PERMISSIONS };
    expect(lostAlertRecipients([newContact])).toEqual([]);
  });

  it("sends nothing when the user has no contacts", () => {
    expect(lostAlertRecipients([])).toEqual([]);
  });

  it("does not count a missing setting as 'on'", () => {
    const odd = [{ name: "Odd" } as unknown as { name: string; can_get_lost_alerts: boolean }];
    expect(lostAlertRecipients(odd)).toEqual([]);
  });

  it("does not change the list it was given", () => {
    const contacts = [{ name: "A", can_get_lost_alerts: false }];
    lostAlertRecipients(contacts);
    expect(contacts).toHaveLength(1);
  });
});

describe("formatCoord", () => {
  it("keeps normal coordinates as they are", () => {
    expect(formatCoord(40.7128)).toBe("40.7128");
    expect(formatCoord(-74.006)).toBe("-74.006");
  });

  it("never uses scientific notation for tiny numbers", () => {
    expect(formatCoord(0.000001)).toBe("0.000001");
    expect(formatCoord(0.0000001)).not.toContain("e");
  });

  it("rounds to 6 decimal places", () => {
    expect(formatCoord(51.50735091234)).toBe("51.507351");
  });

  it("writes a tiny negative number as 0, not -0", () => {
    expect(formatCoord(-0.0000001)).toBe("0");
  });
});

describe("buildMapsLink", () => {
  it("builds a Google Maps link from the coordinates", () => {
    expect(buildMapsLink(coords)).toBe("https://www.google.com/maps?q=40.7128,-74.006");
  });

  it("works in the southern and eastern hemispheres", () => {
    expect(buildMapsLink({ latitude: -33.8688, longitude: 151.2093 })).toBe(
      "https://www.google.com/maps?q=-33.8688,151.2093",
    );
  });

  it("never puts scientific notation in the link", () => {
    const link = buildMapsLink({ latitude: 0.0000001, longitude: -0.0000001 });
    expect(link).toBe("https://www.google.com/maps?q=0,0");
  });
});

describe("buildLostMessage", () => {
  it("includes the name and the maps link", () => {
    expect(buildLostMessage({ userName: "Sam", coords })).toBe(
      "Sam says they're lost. Location: https://www.google.com/maps?q=40.7128,-74.006",
    );
  });

  it("says the location is not available when there are no coordinates", () => {
    expect(buildLostMessage({ userName: "Sam", coords: null })).toBe(
      "Sam says they're lost. Location: not available",
    );
  });

  it("does not send a broken link for invalid coordinates", () => {
    const message = buildLostMessage({ userName: "Sam", coords: { latitude: NaN, longitude: 0 } });
    expect(message).toBe("Sam says they're lost. Location: not available");
  });

  it("uses 'Someone' when the name is blank", () => {
    expect(buildLostMessage({ userName: "   ", coords })).toContain("Someone says they're lost.");
  });
});
