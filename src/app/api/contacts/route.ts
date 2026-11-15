import { connection } from "next/server";
import { checkContact, readContactInput } from "@/features/help/contactInput";
import { createContact, listContacts } from "@/features/help/service";
import { getCurrentUserId } from "@/lib/db";
import { refuseIfLocked } from "@/features/guardians/service";

/** The user's trusted contacts. */
export async function GET() {
  await connection();
  const contacts = await listContacts(await getCurrentUserId());
  return Response.json({ contacts }, { headers: { "Cache-Control": "no-store" } });
}

/** Adds a trusted contact. Every sharing setting is off unless the user turned it on. */
export async function POST(request: Request) {
  const input = readContactInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkContact(input);
  if (!checked.ok) return Response.json({ error: "Invalid contact", errors: checked.errors }, { status: 400 });
  const userId = await getCurrentUserId();
  // A guardian may have turned off adding contacts (then the guardian adds them).
  const locked = await refuseIfLocked(userId, "contacts");
  if (locked) return locked;
  const contact = await createContact(userId, checked.value);
  return Response.json({ contact }, { status: 201 });
}
