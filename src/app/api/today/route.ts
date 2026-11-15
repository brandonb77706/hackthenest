import { connection } from "next/server";
import { getToday } from "@/features/home/service";
import { getCurrentUserId } from "@/lib/db";

/** Today for the current user: GET /api/today?tz=America/Chicago */
export async function GET(request: Request) {
  await connection();
  const tz = new URL(request.url).searchParams.get("tz") || "UTC";
  const today = await getToday(await getCurrentUserId(), tz);
  return Response.json(today, { headers: { "Cache-Control": "no-store" } });
}
