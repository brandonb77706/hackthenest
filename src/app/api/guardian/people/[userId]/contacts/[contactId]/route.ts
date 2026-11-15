import { deleteContactFor, updateContactFor } from "@/features/guardians/support";
import { checkContact, readContactInput } from "@/features/help/contactInput";
import { requireUser } from "@/lib/auth/session";

type Ctx = RouteContext<"/api/guardian/people/[userId]/contacts/[contactId]">;
const notFound = () => Response.json({ error: "Contact not found" }, { status: 404 });

/** A guardian changes a contact they added. What the contact can see stays the person's choice. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { userId, contactId } = await ctx.params;
  const input = readContactInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkContact(input);
  if (!checked.ok) return Response.json({ error: "Invalid contact", errors: checked.errors }, { status: 400 });
  if (!(await updateContactFor(await requireUser(), userId, contactId, checked.value))) return notFound();
  return Response.json({ contact: { id: contactId } });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { userId, contactId } = await ctx.params;
  if (!(await deleteContactFor(await requireUser(), userId, contactId))) return notFound();
  return new Response(null, { status: 204 });
}
