import { connection } from "next/server";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { deleteRoutine, getRoutine, updateRoutine } from "@/features/routine-builder/service";
import { getCurrentUserId } from "@/lib/db";

const notFound = () => Response.json({ error: "Routine not found" }, { status: 404 });

/** One routine with its steps in order. */
export async function GET(_request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const routine = await getRoutine(await getCurrentUserId(), id);
  return routine ? Response.json({ routine }) : notFound();
}

/** Replaces the routine's details and steps with what the editor sends. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  const { id } = await ctx.params;
  const input = readRoutineInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });

  const checked = checkRoutine(input);
  if (!checked.ok) return Response.json({ error: "Invalid routine", errors: checked.errors }, { status: 400 });

  const routine = await updateRoutine(await getCurrentUserId(), id, checked.value);
  return routine ? Response.json({ routine }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  const { id } = await ctx.params;
  const deleted = await deleteRoutine(await getCurrentUserId(), id);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
