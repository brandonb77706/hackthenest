import { connection } from "next/server";
import { checkRoutine, readRoutineInput } from "@/features/routine-builder/routineInput";
import { createRoutine, listRoutines } from "@/features/routine-builder/service";
import { getCurrentUserId } from "@/lib/db";
import { refuseIfLocked } from "@/features/guardians/service";

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

  const userId = await getCurrentUserId();
  // A guardian may have turned off making routines (then the guardian adds them).
  const locked = await refuseIfLocked(userId, "routines");
  if (locked) return locked;
  const routine = await createRoutine(userId, checked.value);
  // Rewards (Nati): award the one-time first_routine tokens here. See docs/rewards.md.
  return Response.json({ routine }, { status: 201 });
}
