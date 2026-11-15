import { markStepDone } from "@/features/home/service";
import { awardStepDone } from "@/features/rewards/service";
import type { StepDoneResponse } from "@/features/rewards/stepDone";
import { recordStreakDay } from "@/features/rewards/streakService";
import { getCurrentUserId } from "@/lib/db";


/**
 * The step player marks a step finished: POST ?tz=America/Chicago { used_help?: boolean }.
 * Answers with the tokens earned, so the player can say so.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/routines/[id]/steps/[stepId]/done">) {
  const { id, stepId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { used_help?: unknown };
  const usedHelp = body?.used_help === true;
  const userId = await getCurrentUserId();
  const checkInId = await markStepDone(userId, id, stepId, usedHelp);
  if (!checkInId) return Response.json({ error: "Step not found" }, { status: 404 });

  // Rewards: tokens for this step (help earns the same), and the streak when a
  // routine is finished. The step is already saved, so a rewards problem is
  // logged and never blocks the person from moving on.
  const timeZone = new URL(request.url).searchParams.get("tz") || "UTC";
  const result: StepDoneResponse = { earned: 0, awards: [], finished_routine: false, streak: null, unlocked: [] };
  try {
    result.awards = await awardStepDone(userId, { checkInId, routineId: id, stepId, usedHelp, timeZone });
    result.finished_routine = result.awards.some((a) => a.reason === "routine");
    if (result.finished_routine) {
      const day = await recordStreakDay(userId, timeZone, checkInId);
      result.awards.push(...day.awards);
      result.streak = day.streak;
      result.unlocked = day.unlocked;
    }
    result.earned = result.awards.reduce((sum, a) => sum + a.amount, 0);
  } catch (error) {
    console.error("[rewards] could not award step tokens", error);
  }
  return Response.json(result);
}
