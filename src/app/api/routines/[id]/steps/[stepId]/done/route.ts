import { markStepDone } from "@/features/home/service";
import { awardStepDone } from "@/features/rewards/service";
import { getCurrentUserId } from "@/lib/db";

/** The step player marks a step finished: POST ?tz=America/Chicago { used_help?: boolean } */
export async function POST(request: Request, ctx: RouteContext<"/api/routines/[id]/steps/[stepId]/done">) {
  const { id, stepId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { used_help?: unknown };
  const usedHelp = body?.used_help === true;
  const userId = await getCurrentUserId();
  const checkInId = await markStepDone(userId, id, stepId, usedHelp);
  if (!checkInId) return Response.json({ error: "Step not found" }, { status: 404 });

  // Rewards: tokens for this step (help earns the same). The step is already saved,
  // so a rewards problem is logged and never blocks the person from moving on.
  const timeZone = new URL(request.url).searchParams.get("tz") || "UTC";
  try {
    await awardStepDone(userId, { checkInId, routineId: id, stepId, usedHelp, timeZone });
  } catch (error) {
    console.error("[rewards] could not award step tokens", error);
  }
  return new Response(null, { status: 204 });
}
