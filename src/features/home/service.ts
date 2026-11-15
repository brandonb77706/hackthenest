// Today's data for the home and Routines tabs. Server code only.

import mongoose, { isValidObjectId } from "mongoose";
import {
  CheckInModel,
  connectDB,
  RoutineModel,
  StepModel,
  toRecord,
  TokenTransactionModel,
  UserProfileModel,
} from "@/lib/db";
import { localNow } from "@/lib/time";
import type { CheckIn, ID, Routine, Step } from "@/lib/types";
import { summarizeDay, type TodayRoutine } from "./today";

export interface TodayResponse {
  name: string;
  streak: number;
  tokens: number;
  routines: TodayRoutine[];
}

export async function getToday(userId: ID, timeZone: string, at = new Date()): Promise<TodayResponse> {
  await connectDB();
  const [profile, tokenSum, routineDocs, stepDocs, recent] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }, { name: 1, current_streak: 1 }),
    TokenTransactionModel.aggregate<{ total: number }>([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RoutineModel.find({ user_id: userId, active: true }),
    StepModel.find({ user_id: userId }, { routine_id: 1, order: 1 }).sort({ order: 1 }),
    // A day and a half covers "today" in any time zone; filtered to the local date below.
    CheckInModel.find({ user_id: userId, status: "done", time: { $gte: new Date(at.getTime() - 36 * 3600_000) } }),
  ]);

  const stepIds = new Map<string, string[]>();
  for (const doc of stepDocs) {
    const step = toRecord<Step>(doc);
    stepIds.set(step.routine_id, [...(stepIds.get(step.routine_id) ?? []), step.id]);
  }
  const now = localNow(at, timeZone);
  const doneStepIds = new Set(
    recent
      .map((doc) => toRecord<CheckIn>(doc))
      .filter((c) => localNow(new Date(c.time), timeZone).date === now.date)
      .map((c) => c.step_id),
  );

  return {
    name: profile?.name ?? "",
    streak: profile?.current_streak ?? 0,
    tokens: tokenSum[0]?.total ?? 0,
    routines: summarizeDay({
      routines: routineDocs.map((doc) => {
        const r = toRecord<Routine>(doc);
        return { ...r, step_ids: stepIds.get(r.id) ?? [] };
      }),
      doneStepIds,
      weekday: now.weekday,
    }),
  };
}

/** Saves that a step was finished. Returns false if the step isn't in that routine or isn't the user's. */
export async function markStepDone(userId: ID, routineId: string, stepId: string, usedHelp: boolean): Promise<boolean> {
  if (!isValidObjectId(routineId) || !isValidObjectId(stepId)) return false;
  await connectDB();
  const step = await StepModel.findOne({ user_id: userId, _id: stepId, routine_id: routineId }, { _id: 1 });
  if (!step) return false;
  await CheckInModel.create({ user_id: userId, step_id: stepId, routine_id: routineId, status: "done", used_help: usedHelp });
  return true;
}
