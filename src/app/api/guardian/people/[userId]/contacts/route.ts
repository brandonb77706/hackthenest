import { addContactFor } from "@/features/guardians/support";
import { checkContact, readContactInput } from "@/features/help/contactInput";
import { requireUser } from "@/lib/auth/session";

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
