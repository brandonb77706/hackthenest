import { connection } from "next/server";
import { listLinks } from "@/features/guardians/service";
import { requireUser } from "@/lib/auth/session";

/** A user's guardians, or a guardian's people: GET /api/links */
export async function GET() {
  await connection();
  const user = await requireUser();
  return Response.json({ role: user.role, links: await listLinks(user) }, { headers: { "Cache-Control": "no-store" } });
}
