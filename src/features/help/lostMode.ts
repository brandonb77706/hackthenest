// Lost mode logic. Plain functions, no UI and no browser calls, so they are easy to test.
// See docs/ai-prompts.md section 4.

/** The calm steps shown on screen as soon as the user says they're lost. From docs/ai-prompts.md. */
export const LOST_STEPS = ["Stay where you are.", "Find a safe place to sit.", "Help is coming."] as const;

/** One location reading. Same names the browser uses. */
export interface Coords {
  latitude: number;
  longitude: number;
}

/** True only for real numbers on Earth. Stops "NaN" or a bad reading from reaching a contact. */
export function isValidCoords(c: Coords | null | undefined): c is Coords {
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.latitude) <= 90 &&
    Math.abs(c.longitude) <= 180
  );
}

/**
 * Writes one coordinate as plain decimals, rounded to 6 places (about 10 cm).
 * A plain template string would turn 0.0000001 into "1e-7", which breaks the link.
 * toFixed(6) rounds; Number(...) then drops trailing zeros and turns "-0" into "0".
 */
export function formatCoord(n: number): string {
  return String(Number(n.toFixed(6)));
}

/** A link that opens the spot in Google Maps on any phone. */
export function buildMapsLink(c: Coords): string {
  return `https://www.google.com/maps?q=${formatCoord(c.latitude)},${formatCoord(c.longitude)}`;
}

/**
 * Who may get the lost message: only contacts the user turned lost alerts on for.
 * Everyone else gets nothing. Sharing is off by default, so a new contact is never in this list
 * until the user says so. `=== true` means a missing or odd value counts as "off".
 */
export function lostAlertRecipients<T extends { can_get_lost_alerts: boolean }>(contacts: T[]): T[] {
  return contacts.filter((contact) => contact.can_get_lost_alerts === true);
}

/**
 * The text a trusted contact receives: "{name} says they're lost. Location: {maps link}".
 * If we have no location, we say so instead of sending a broken link.
 */
export function buildLostMessage(input: { userName: string; coords: Coords | null }): string {
  const name = input.userName.trim() || "Someone";
  const where = isValidCoords(input.coords) ? buildMapsLink(input.coords) : "not available";
  return `${name} says they're lost. Location: ${where}`;
}
