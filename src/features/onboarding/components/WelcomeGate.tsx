import { redirect } from "next/navigation";
import { connection } from "next/server";
import { homeFor } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { userNeedsWelcome } from "../service";

/**
 * Renders nothing. Sends a new user to Welcome first, and a guardian to the
 * guardian view. Put it inside <Suspense> in a layout.
 */
export async function WelcomeGate() {
  await connection();
  const user = await requireUser();
  if (user.role === "guardian") redirect(homeFor("guardian"));
  if (await userNeedsWelcome(user.id)) redirect("/welcome");
  return null;
}
