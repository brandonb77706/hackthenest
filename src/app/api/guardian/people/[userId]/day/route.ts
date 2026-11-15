import { connection } from "next/server";
import { getPersonDay } from "@/features/guardians/support";
import { requireUser } from "@/lib/auth/session";

/** A linked person's day, as much as they share: GET ?tz=America/Chicago */
export async function GET(request: Request, ctx: RouteContext<"/api/guardian/people/[userId]/day">) {
  await connection();
  const { userId } = await ctx.params;
  const tz = new URL(request.url).searchParams.get("tz") || "UTC";
  const day = await getPersonDay(await requireUser(), userId, tz);
  if (!day) return Response.json({ error: "Not linked" }, { status: 404 });
  return Response.json(day, { headers: { "Cache-Control": "no-store" } });
}
