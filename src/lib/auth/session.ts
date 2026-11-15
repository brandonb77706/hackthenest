// The signed-in user, for server code (pages, route handlers).
// Reads cookies, so in a page call it inside <Suspense>.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ID } from "@/lib/types";
import { toRole, type Role } from "./roles";
import { getAuth } from "./server";

export interface SignedInUser {
  id: ID;
  name: string;
  email: string;
  role: Role;
}

/** The signed-in user, or null. Looked up once per request. */
export const getSignedInUser = cache(async (): Promise<SignedInUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: toRole(role) };
});

/** The signed-in user. Not signed in: goes to the login page. */
export async function requireUser(): Promise<SignedInUser> {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  return user;
}
