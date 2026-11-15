import { deletePhrase } from "@/features/help/service";
import { getCurrentUserId } from "@/lib/db";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/phrases/[id]">) {
  const { id } = await ctx.params;
  const deleted = await deletePhrase(await getCurrentUserId(), id);
  return deleted ? new Response(null, { status: 204 }) : Response.json({ error: "Message not found" }, { status: 404 });
}
