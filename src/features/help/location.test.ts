import { describe, expect, it } from "vitest";
import {
  LOCATION_FAILURE_MESSAGES,
  LOCATION_OPTIONS,
  getCurrentLocation,
  locationErrorReason,
  type GeolocationLike,
  type LocationFailure,
} from "./location";

// A fake browser geolocation. Tests never use a real GPS or show a real permission prompt.
function fakeGeo(behavior: {
  position?: { latitude: number; longitude: number };
  errorCode?: number;
  throws?: boolean;
}): GeolocationLike & { calls: PositionOptions[] } {
  const calls: PositionOptions[] = [];
  return {
    calls,
    getCurrentPosition(onSuccess, onError, options) {
      if (options) calls.push(options);
      if (behavior.throws) throw new Error("SecurityError");
      if (behavior.errorCode !== undefined) {
        onError?.({ code: behavior.errorCode, message: "" } as GeolocationPositionError);
      } else {
        onSuccess({ coords: behavior.position } as GeolocationPosition);
      }
    },
  };
}

describe("getCurrentLocation", () => {
  it("returns the coordinates when the browser finds the user", async () => {
    const geo = fakeGeo({ position: { latitude: 40.7128, longitude: -74.006 } });
    expect(await getCurrentLocation(geo)).toEqual({
      ok: true,
      coords: { latitude: 40.7128, longitude: -74.006 },
    });
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ])("turns browser error %d into '%s'", async (errorCode: number, reason: string) => {
    expect(await getCurrentLocation(fakeGeo({ errorCode }))).toEqual({ ok: false, reason });
  });

  it("says 'unsupported' when the browser has no geolocation", async () => {
    expect(await getCurrentLocation(undefined)).toEqual({ ok: false, reason: "unsupported" });
  });

  it("does not pass on a bad reading", async () => {
    const geo = fakeGeo({ position: { latitude: NaN, longitude: 0 } });
    expect(await getCurrentLocation(geo)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("does not crash if the browser throws right away", async () => {
    expect(await getCurrentLocation(fakeGeo({ throws: true }))).toEqual({ ok: false, reason: "unavailable" });
  });

  it("asks the browser for a fresh, accurate reading with a time limit", async () => {
    const geo = fakeGeo({ position: { latitude: 1, longitude: 1 } });
    await getCurrentLocation(geo);
    expect(geo.calls[0]).toEqual(LOCATION_OPTIONS);
  });
});

describe("locationErrorReason", () => {
  it("maps the browser's three error codes", () => {
    expect(locationErrorReason(1)).toBe("denied");
    expect(locationErrorReason(2)).toBe("unavailable");
    expect(locationErrorReason(3)).toBe("timeout");
  });

  it("treats an unknown code as unavailable", () => {
    expect(locationErrorReason(0)).toBe("unavailable");
    expect(locationErrorReason(99)).toBe("unavailable");
  });
});

describe("LOCATION_OPTIONS", () => {
  it("never reuses an old reading", () => {
    expect(LOCATION_OPTIONS.maximumAge).toBe(0);
  });

  it("uses the most accurate location available", () => {
    expect(LOCATION_OPTIONS.enableHighAccuracy).toBe(true);
  });

  it("gives up after a limit so the screen never waits forever", () => {
    expect(LOCATION_OPTIONS.timeout).toBeGreaterThan(0);
    expect(LOCATION_OPTIONS.timeout).toBeLessThanOrEqual(30_000);
  });
});

describe("LOCATION_FAILURE_MESSAGES", () => {
  const reasons: LocationFailure[] = ["denied", "unavailable", "timeout", "unsupported"];

  it.each(reasons)("has a message for %s", (reason) => {
    expect(LOCATION_FAILURE_MESSAGES[reason].length).toBeGreaterThan(0);
  });

  it.each(reasons)("tells the person to stay where they are (%s)", (reason) => {
    expect(LOCATION_FAILURE_MESSAGES[reason]).toContain("Stay where you are.");
  });

  it.each(reasons)("uses short sentences (%s)", (reason) => {
    const sentences = LOCATION_FAILURE_MESSAGES[reason].split(".").filter((s) => s.trim());
    for (const s of sentences) expect(s.trim().split(/\s+/).length).toBeLessThanOrEqual(15);
  });
});
