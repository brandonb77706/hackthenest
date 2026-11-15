import { checkContact, readContactInput } from "@/features/help/contactInput";
import { deleteContact, listContacts, updateContact } from "@/features/help/service";
import { onlySharingChanged } from "@/features/guardians/editRules";
import { getCurrentUserId } from "@/lib/db";
import { refuseIfLocked } from "@/features/guardians/service";

const notFound = () => Response.json({ error: "Contact not found" }, { status: 404 });

export async function PATCH(request: Request, ctx: RouteContext<"/api/contacts/[id]">) {
  const { id } = await ctx.params;
  const input = readContactInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkContact(input);
  if (!checked.ok) return Response.json({ error: "Invalid contact", errors: checked.errors }, { status: 400 });
  const userId = await getCurrentUserId();
  // Choosing what a contact can see is always the user's. Changing who they are
  // can be turned off by a guardian.
  const before = (await listContacts(userId)).find((c) => c.id === id);
  if (!before) return notFound();
  if (!onlySharingChanged(before, checked.value)) {
    const locked = await refuseIfLocked(userId, "contacts");
    if (locked) return locked;
  }
  const contact = await updateContact(userId, id, checked.value);
  return contact ? Response.json({ contact }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/contacts/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId();
  const locked = await refuseIfLocked(userId, "contacts");
  if (locked) return locked;
  const deleted = await deleteContact(userId, id);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
