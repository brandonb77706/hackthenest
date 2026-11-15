import { requireUser } from "@/lib/auth/session";
import type { ID } from "@/lib/types";

/**
 * The demo account (Jordan). `npm run db:seed` puts the sample data under this
 * id and creates the jordan@example.com login for it.
 */
export const DEMO_USER_ID: ID = "64b000000000000000000001";

/**
 * The signed-in user's id. Server code only. Every query filters by it.
 * Not signed in: goes to the login page (the proxy already sends API calls a 401).
 */
export async function getCurrentUserId(): Promise<ID> {
  return (await requireUser()).id;
}
