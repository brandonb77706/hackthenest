import { draftRoutine } from "@/features/routine-builder/aiDraft";
import { cleanGoal } from "@/features/routine-builder/supportLevel";
import { connectDB, getCurrentUserId, UserProfileModel } from "@/lib/db";
import { SUPPORT_LEVELS, type SupportLevel } from "@/lib/types";

function isSupportLevel(value: unknown): value is SupportLevel {
  return (SUPPORT_LEVELS as readonly unknown[]).includes(value);
}

/** The user's saved support level, or "high" (the most help) if there's no profile or no database. */
async function savedSupportLevel(): Promise<SupportLevel> {
  try {
    await connectDB();
    const profile = await UserProfileModel.findOne({ user_id: await getCurrentUserId() }, { support_level: 1 });
    return isSupportLevel(profile?.support_level) ? profile.support_level : "high";
  } catch {
    return "high";
  }
}

/**
 * Drafts a routine from what the person said: POST { goal, supportLevel? }.
 * supportLevel is sent by "Smaller steps" / "Bigger steps". Saves nothing.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { goal?: unknown; supportLevel?: unknown } | null;
  const goal = cleanGoal(body?.goal);
  if (!goal) return Response.json({ error: "Tell me what you need first." }, { status: 400 });

  const supportLevel = isSupportLevel(body?.supportLevel) ? body.supportLevel : await savedSupportLevel();
  const result = await draftRoutine(goal, supportLevel);

  if (!result.ok) {
    return Response.json({ error: "I couldn't make steps for that.", reason: result.reason }, { status: 502 });
  }
  return Response.json({ routine: result.routine, supportLevel });
}
