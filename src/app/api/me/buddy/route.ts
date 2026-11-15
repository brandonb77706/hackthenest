import { chooseBuddy } from "@/features/me/service";
import { getCurrentUserId } from "@/lib/db";

/** Equips a Buddy: PUT { avatar_id }. Starter Buddies are free; others must be unlocked. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { avatar_id?: unknown } | null;
  if (typeof body?.avatar_id !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  const result = await chooseBuddy(await getCurrentUserId(), body.avatar_id);
  if (!result.ok) {
    return result.reason === "locked"
      ? Response.json({ error: "That Buddy isn't unlocked yet." }, { status: 403 })
      : Response.json({ error: "Buddy not found" }, { status: 404 });
  }
  return Response.json({ buddy_name: result.name });
}
