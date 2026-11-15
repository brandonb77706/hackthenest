import { deleteRoutineFor, updateRoutineFor } from "@/features/guardians/support";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { requireUser } from "@/lib/auth/session";

type Ctx = RouteContext<"/api/guardian/people/[userId]/routines/[routineId]">;
const notFound = () => Response.json({ error: "Routine not found" }, { status: 404 });

/** A guardian changes a routine: any one if routines are shared, or one they added. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { userId, routineId } = await ctx.params;
  const input = readRoutineInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });
  const checked = checkRoutine(input);
  if (!checked.ok) return Response.json({ error: "Invalid routine", errors: checked.errors }, { status: 400 });
  if (!(await updateRoutineFor(await requireUser(), userId, routineId, checked.value))) return notFound();
  return Response.json({ routine: { id: routineId } });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { userId, routineId } = await ctx.params;
  if (!(await deleteRoutineFor(await requireUser(), userId, routineId))) return notFound();
  return new Response(null, { status: 204 });
}
