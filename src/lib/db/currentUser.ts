import type { ID } from "@/lib/types";

/**
 * Fake user until real login is added. Everyone shares this test user.
 * Every query still filters by user_id, so swapping this for real auth later
 * doesn't change any data or feature code.
 */
export const DEMO_USER_ID: ID = "64b000000000000000000001";

/** The signed-in user's id. Server code only. */
export async function getCurrentUserId(): Promise<ID> {
  return DEMO_USER_ID;
}
