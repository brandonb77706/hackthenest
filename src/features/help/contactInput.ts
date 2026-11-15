// Checks a trusted contact sent to /api/contacts. Shared by the browser and the server.

import { CONTACT_METHODS, type ContactMethod, type TrustedContactPermissions } from "@/lib/types";

export interface ContactInput extends TrustedContactPermissions {
  name: string;
  method: ContactMethod;
  /** Phone number, email address, or Telegram handle */
  contact: string;
  /** Short word for who they are, like "Your brother" */
  relation: string;
}

export interface ContactErrors {
  name?: string;
  contact?: string;
}

export type ContactCheck = { ok: true; value: ContactInput } | { ok: false; errors: ContactErrors };

/** Digits with an optional leading +, like +1 555 010 0142 → +15550100142 */
export function cleanPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  return (trimmed.startsWith("+") ? "+" : "") + digits;
}

export function checkContact(raw: ContactInput): ContactCheck {
  const errors: ContactErrors = {};
  const name = raw.name.trim();
  let contact = raw.contact.trim();

  if (!name) errors.name = "Add their name.";
  else if (name.length > 40) errors.name = "Use 40 letters or fewer.";

  if (raw.method === "sms") {
    contact = cleanPhone(contact);
    if (contact.replace("+", "").length < 7) errors.contact = "Add their phone number.";
  } else if (raw.method === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) errors.contact = "Add their email address.";
  } else if (!contact) {
    errors.contact = "Add how to reach them.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      method: raw.method,
      contact,
      relation: raw.relation.trim().slice(0, 40),
      can_see_routines: raw.can_see_routines === true,
      can_get_lost_alerts: raw.can_get_lost_alerts === true,
      can_get_stuck_alerts: raw.can_get_stuck_alerts === true,
    },
  };
}

/** Reads a request body. Anything shaped wrong becomes null. Sharing settings default to off. */
export function readContactInput(body: unknown): ContactInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || typeof b.contact !== "string") return null;
  if (!(CONTACT_METHODS as readonly unknown[]).includes(b.method)) return null;
  return {
    name: b.name,
    method: b.method as ContactMethod,
    contact: b.contact,
    relation: typeof b.relation === "string" ? b.relation : "",
    can_see_routines: b.can_see_routines === true,
    can_get_lost_alerts: b.can_get_lost_alerts === true,
    can_get_stuck_alerts: b.can_get_stuck_alerts === true,
  };
}
