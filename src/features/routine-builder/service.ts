// Routine database functions. Server code only (route handlers and server components).
// Every function takes the user's id and only touches that user's records.

import mongoose, { isValidObjectId } from "mongoose";
import { connectDB, RoutineModel, StepModel, toRecord } from "@/lib/db";
import type { ID, Routine, Step } from "@/lib/types";
import type { RoutineInput } from "./routineInput";

export interface RoutineWithSteps extends Routine {
  steps: Step[];
}

export interface RoutineSummary extends Routine {
  step_count: number;
}

/** Bad or unknown ids return null, so a route can answer 404. */
function asId(id: string): ID | null {
  return isValidObjectId(id) ? id : null;
}

export async function listRoutines(userId: ID): Promise<RoutineSummary[]> {
  await connectDB();
  const routines = await RoutineModel.find({ user_id: userId }).sort({ start_time: 1, title: 1 });
  const counts = await StepModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$routine_id", count: { $sum: 1 } } },
  ]);
  const countFor = new Map(counts.map((c) => [c._id.toHexString(), c.count]));
  return routines.map((doc) => {
    const routine = toRecord<Routine>(doc);
    return { ...routine, step_count: countFor.get(routine.id) ?? 0 };
  });
}

export async function getRoutine(userId: ID, routineId: string): Promise<RoutineWithSteps | null> {
  const id = asId(routineId);
  if (!id) return null;
  await connectDB();
  const routine = await RoutineModel.findOne({ user_id: userId, _id: id });
  if (!routine) return null;
  const steps = await StepModel.find({ user_id: userId, routine_id: id }).sort({ order: 1 });
  return { ...toRecord<Routine>(routine), steps: steps.map((s) => toRecord<Step>(s)) };
}

/** Saves the routine and all its steps together. If anything fails, nothing is saved. */
export async function createRoutine(userId: ID, input: RoutineInput): Promise<RoutineWithSteps> {
  await connectDB();
  const routineId = await mongoose.connection.transaction(async (session) => {
    const [routine] = await RoutineModel.create(
      [{ user_id: userId, title: input.title, goal: input.goal, days: input.days, start_time: input.start_time }],
      { session },
    );
    await StepModel.create(
      input.steps.map((step, i) => ({
        user_id: userId,
        routine_id: routine._id,
        order: i + 1,
        text: step.text,
        minutes: step.minutes,
      })),
      { session, ordered: true },
    );
    return routine._id.toHexString();
  });
  const saved = await getRoutine(userId, routineId);
  if (!saved) throw new Error("Routine was saved but couldn't be read back");
  return saved;
}

/**
 * Updates the routine and its steps together. Steps with an id are updated
 * (so past check-ins still point at them), steps without one are added, and
 * saved steps that aren't in the list are removed.
 */
export async function updateRoutine(
  userId: ID,
  routineId: string,
  input: RoutineInput,
): Promise<RoutineWithSteps | null> {
  const id = asId(routineId);
  if (!id) return null;
  await connectDB();

  const found = await mongoose.connection.transaction(async (session) => {
    const routine = await RoutineModel.findOneAndUpdate(
      { user_id: userId, _id: id },
      { title: input.title, goal: input.goal, days: input.days, start_time: input.start_time },
      { session, runValidators: true },
    );
    if (!routine) return false;

    const existing = await StepModel.find({ user_id: userId, routine_id: id }, { _id: 1 }, { session });
    const existingIds = new Set(existing.map((s) => String(s._id)));
    const keptIds = new Set<string>();

    for (const [i, step] of input.steps.entries()) {
      const fields = { order: i + 1, text: step.text, minutes: step.minutes };
      if (step.id && existingIds.has(step.id)) {
        keptIds.add(step.id);
        await StepModel.updateOne({ user_id: userId, _id: step.id }, fields, { session, runValidators: true });
      } else {
        await StepModel.create([{ user_id: userId, routine_id: id, ...fields }], { session });
      }
    }

    const removed = [...existingIds].filter((stepId) => !keptIds.has(stepId));
    if (removed.length > 0) {
      await StepModel.deleteMany({ user_id: userId, _id: { $in: removed } }, { session });
    }
    return true;
  });

  return found ? getRoutine(userId, id) : null;
}

/** Deletes the routine and its steps. Past check-ins are kept as history. Returns false if not found. */
export async function deleteRoutine(userId: ID, routineId: string): Promise<boolean> {
  const id = asId(routineId);
  if (!id) return false;
  await connectDB();
  return mongoose.connection.transaction(async (session) => {
    const result = await RoutineModel.deleteOne({ user_id: userId, _id: id }, { session });
    if (result.deletedCount === 0) return false;
    await StepModel.deleteMany({ user_id: userId, routine_id: id }, { session });
    return true;
  });
}
