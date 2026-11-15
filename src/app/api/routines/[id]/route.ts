import { connection } from "next/server";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { deleteRoutine, getRoutine, updateRoutine } from "@/features/routine-builder/service";
import { getCurrentUserId } from "@/lib/db";
import { refuseIfLocked } from "@/features/guardians/service";

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

  const userId = await getCurrentUserId();
  const locked = await refuseIfLocked(userId, "routines");
  if (locked) return locked;
  const routine = await updateRoutine(userId, id, checked.value);
  return routine ? Response.json({ routine }) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  const { id } = await ctx.params;
  const userId = await getCurrentUserId();
  const locked = await refuseIfLocked(userId, "routines");
  if (locked) return locked;
  const deleted = await deleteRoutine(userId, id);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
