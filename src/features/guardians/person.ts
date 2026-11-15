// For the guardian's pages: the signed-in guardian and the person they're viewing.
// Not a guardian, or not linked to this person: sent somewhere safe.

import { redirect } from "next/navigation";
import { requireUser, type SignedInUser } from "@/lib/auth/session";
import { listLinks, type LinkedPerson } from "./service";

export async function requirePerson(personId: string): Promise<{ guardian: SignedInUser; person: LinkedPerson }> {
  const guardian = await requireUser();
  if (guardian.role !== "guardian") redirect("/");
  const person = (await listLinks(guardian)).find((p) => p.id === personId);
  if (!person) redirect("/guardian?manage=1");
  return { guardian, person };
}
