import { connection } from "next/server";
import { addContactFor, listContactsFor } from "@/features/guardians/support";
import { checkContact, readContactInput } from "@/features/help/contactInput";
import { requireUser } from "@/lib/auth/session";

/** The contacts this guardian added for the person. */
export async function GET(_request: Request, ctx: RouteContext<"/api/guardian/people/[userId]/contacts">) {
  await connection();
  const { userId } = await ctx.params;
  const contacts = await listContactsFor(await requireUser(), userId);
  if (!contacts) return Response.json({ error: "Not linked" }, { status: 404 });
  return Response.json({ contacts }, { headers: { "Cache-Control": "no-store" } });
}

/** A guardian adds a trusted contact for someone. Sharing starts off; the person turns it on. */
export async function POST(request: Request, ctx: RouteContext<"/api/guardian/people/[userId]/contacts">) {
  const { userId } = await ctx.params;
  const input = readContactInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkContact(input);
  if (!checked.ok) return Response.json({ error: "Invalid contact", errors: checked.errors }, { status: 400 });
  const id = await addContactFor(await requireUser(), userId, checked.value);
  if (!id) return Response.json({ error: "Not linked" }, { status: 404 });
  return Response.json({ id }, { status: 201 });
}
