import { checkContact, readContactInput } from "@/features/help/contactInput";
import { deleteContact, updateContact } from "@/features/help/service";
import { getCurrentUserId } from "@/lib/db";

const notFound = () => Response.json({ error: "Contact not found" }, { status: 404 });

export async function PATCH(request: Request, ctx: RouteContext<"/api/contacts/[id]">) {
  const { id } = await ctx.params;
  const input = readContactInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkContact(input);
  if (!checked.ok) return Response.json({ error: "Invalid contact", errors: checked.errors }, { status: 400 });
  const contact = await updateContact(await getCurrentUserId(), id, checked.value);
  return contact ? Response.json({ contact }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/contacts/[id]">) {
  const { id } = await ctx.params;
  const deleted = await deleteContact(await getCurrentUserId(), id);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
