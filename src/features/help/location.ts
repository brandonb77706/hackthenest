// Getting the user's location: the types, the settings, what each failure means,
// and the one function that asks the browser. Runs in the browser only (Client Components).

import { isValidCoords, type Coords } from "./lostMode";

/** Why we could not get a location. "unsupported" means this browser has no geolocation at all. */
export type LocationFailure = "denied" | "unavailable" | "timeout" | "unsupported";

/** What asking for a location gives back. Never throws: the screen checks `ok`. */
export type LocationResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: LocationFailure };

/** Settings for the browser's getCurrentPosition. */
export const LOCATION_OPTIONS = {
  /** Use GPS when the device has it, not just a rough guess from wifi. */
  enableHighAccuracy: true,
  /** 0 = never reuse an old reading. A lost person may have moved. */
  maximumAge: 0,
  /** Give up after 15 seconds (in milliseconds) so the screen never waits forever. */
  timeout: 15_000,
} as const;

/** The browser reports failures as a code: 1 = denied, 2 = unavailable, 3 = timeout. */
export function locationErrorReason(code: number): Exclude<LocationFailure, "unsupported"> {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  // Code 2, or any code we don't know, means "could not find you".
  return "unavailable";
}

/** The part of the browser's geolocation we use. Tests pass in a fake with this shape. */
export type GeolocationLike = Pick<Geolocation, "getCurrentPosition">;

/**
 * Asks the browser for the user's location once. The browser shows its own permission prompt.
 * Always resolves, never throws or rejects: check `result.ok`.
 * `geo` defaults to the real navigator.geolocation. Tests pass a fake instead.
 */
export function getCurrentLocation(
  geo: GeolocationLike | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation,
): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!geo) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    try {
      geo.getCurrentPosition(
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          // A bad reading never goes on. The person gets the same calm message as "can't find you".
          resolve(isValidCoords(coords) ? { ok: true, coords } : { ok: false, reason: "unavailable" });
        },
        (error) => resolve({ ok: false, reason: locationErrorReason(error.code) }),
        LOCATION_OPTIONS,
      );
    } catch {
      // Some browsers throw right away (for example on an insecure page).
      resolve({ ok: false, reason: "unavailable" });
    }
  });
}

/** Short, calm words for each failure, with one next action. Plain language, no jargon. */
export const LOCATION_FAILURE_MESSAGES: Record<LocationFailure, string> = {
  denied: "Location is turned off. You can turn it on in your browser settings. Stay where you are.",
  unavailable: "I can't find where you are right now. Stay where you are.",
  timeout: "It is taking too long to find you. Try again. Stay where you are.",
  unsupported: "This device can't share a location. Stay where you are.",
};
