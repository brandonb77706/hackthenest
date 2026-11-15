import { addRoutineFor } from "@/features/guardians/support";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { requireUser } from "@/lib/auth/session";

/** A guardian adds a routine for someone they support. Same checks as the person's own builder. */
export async function POST(request: Request, ctx: RouteContext<"/api/guardian/people/[userId]/routines">) {
  const { userId } = await ctx.params;
  const input = readRoutineInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkRoutine(input);
  if (!checked.ok) return Response.json({ error: "Invalid routine", errors: checked.errors }, { status: 400 });
  const id = await addRoutineFor(await requireUser(), userId, checked.value);
  if (!id) return Response.json({ error: "Not linked" }, { status: 404 });
  return Response.json({ id }, { status: 201 });
}
