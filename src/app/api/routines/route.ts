import { connection } from "next/server";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { createRoutine, listRoutines } from "@/features/routine-builder/service";
import { getCurrentUserId } from "@/lib/db";

/** The user's routines, with how many steps each has. */
export async function GET() {
  await connection();
  const routines = await listRoutines(await getCurrentUserId());
  return Response.json({ routines });
}

/** Saves a new routine and its steps. */
export async function POST(request: Request) {
  const input = readRoutineInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Bad request" }, { status: 400 });

  const checked = checkRoutine(input);
  if (!checked.ok) return Response.json({ error: "Invalid routine", errors: checked.errors }, { status: 400 });

  const routine = await createRoutine(await getCurrentUserId(), checked.value);
  // Rewards (Nati): award the one-time first_routine tokens here. See docs/rewards.md.
  return Response.json({ routine }, { status: 201 });
}
