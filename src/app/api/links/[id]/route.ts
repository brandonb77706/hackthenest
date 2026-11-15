import { removeLink, updateSharing } from "@/features/guardians/service";
import { requireUser } from "@/lib/auth/session";
import type { TrustedContactPermissions } from "@/lib/types";

const SHARING_KEYS = ["can_see_routines", "can_get_lost_alerts", "can_get_stuck_alerts"] as const;

/** The user changes what a guardian can see: PATCH { can_see_routines?, ... } */
export async function PATCH(request: Request, ctx: RouteContext<"/api/links/[id]">) {
  const { id } = await ctx.params;
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const patch: Partial<TrustedContactPermissions> = {};
  for (const key of SHARING_KEYS) {
    if (body?.[key] === undefined) continue;
    if (typeof body[key] !== "boolean") return Response.json({ error: `${key} must be true or false` }, { status: 400 });
    patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nothing to change" }, { status: 400 });
  if (!(await updateSharing(user, id, patch))) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(patch);
}

/** Either side ends the link: DELETE /api/links/:id */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/links/[id]">) {
  const { id } = await ctx.params;
  const user = await requireUser();
  if (!(await removeLink(user, id))) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
