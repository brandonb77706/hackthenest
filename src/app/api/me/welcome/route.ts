import { finishWelcome } from "@/features/onboarding/service";
import { parseWelcomeInput } from "@/features/onboarding/welcome";
import { getCurrentUserId } from "@/lib/db";

/** Finishes Welcome: POST { name, avatar_id } */
export async function POST(request: Request) {
  const parsed = parseWelcomeInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const result = await finishWelcome(await getCurrentUserId(), parsed.value);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ buddy_name: result.buddy_name });
}
