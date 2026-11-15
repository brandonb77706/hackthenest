import { markStepDone } from "@/features/home/service";
import { getCurrentUserId } from "@/lib/db";

/** The step player marks a step finished: POST { used_help?: boolean } */
export async function POST(request: Request, ctx: RouteContext<"/api/routines/[id]/steps/[stepId]/done">) {
  const { id, stepId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { used_help?: unknown };
  const saved = await markStepDone(await getCurrentUserId(), id, stepId, body?.used_help === true);
  // Rewards (Nati): award step tokens here. Help earns the same tokens.
  return saved ? new Response(null, { status: 204 }) : Response.json({ error: "Step not found" }, { status: 404 });
}
