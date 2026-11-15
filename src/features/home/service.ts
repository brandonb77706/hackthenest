// Today's data for the home and Routines tabs. Server code only.

import mongoose, { isValidObjectId } from "mongoose";
import {
  AvatarModel,
  CheckInModel,
  connectDB,
  RoutineModel,
  StepModel,
  toRecord,
  TokenTransactionModel,
  UserProfileModel,
} from "@/lib/db";
import { getEditRules } from "@/features/guardians/service";
import type { EditRules } from "@/features/guardians/editRules";
import { settingsOf, type MeSettings } from "@/features/me/service";
import { liveStreak } from "@/features/rewards/streak";
import { getChallenges } from "@/features/rewards/challengeService";
import type { ChallengeStatus } from "@/features/rewards/challenges";
import { localNow } from "@/lib/time";
import type { Avatar, CheckIn, ID, Routine, Step, UserProfile } from "@/lib/types";
import { completedStepsOnDate, summarizeDay, type TodayRoutine } from "./today";

export interface TodayResponse {
  name: string;
  streak: number;
  tokens: number;
  routines: TodayRoutine[];
  /** Color scheme and Buddy, so this device can catch up with the profile */
  settings: MeSettings;
  /** Whether the user can make and change routines (a guardian can turn it off). Missing means allowed */
  edit?: EditRules;
  /** Today's challenges with progress */
  challenges?: ChallengeStatus[];
}

export async function getToday(userId: ID, timeZone: string, at = new Date()): Promise<TodayResponse> {
  await connectDB();
  const [profile, tokenSum, routineDocs, stepDocs, recent, edit, challenges] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }),
    TokenTransactionModel.aggregate<{ total: number }>([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RoutineModel.find({ user_id: userId, active: true }),
    StepModel.find({ user_id: userId }, { routine_id: 1, order: 1 }).sort({ order: 1 }),
    // A day and a half covers "today" in any time zone; filtered to the local date below.
    CheckInModel.find({ user_id: userId, status: "done", time: { $gte: new Date(at.getTime() - 36 * 3600_000) } }),
    getEditRules(userId),
    getChallenges(userId, timeZone, at),
  ]);

  const stepIds = new Map<string, string[]>();
  for (const doc of stepDocs) {
    const step = toRecord<Step>(doc);
    stepIds.set(step.routine_id, [...(stepIds.get(step.routine_id) ?? []), step.id]);
  }
  const now = localNow(at, timeZone);
  const doneStepIds = completedStepsOnDate(recent.map((doc) => toRecord<CheckIn>(doc)), at, timeZone);

  const profileRecord = profile ? toRecord<UserProfile>(profile) : null;
  const buddyDoc = profileRecord?.equipped_avatar_id ? await AvatarModel.findById(profileRecord.equipped_avatar_id) : null;

  return {
    name: profile?.name ?? "",
    // A streak not kept up yesterday shows as 0, not the old number.
    streak: profileRecord ? liveStreak(profileRecord, now.date) : 0,
    settings: settingsOf(profileRecord, buddyDoc ? toRecord<Avatar>(buddyDoc).name : null),
    tokens: tokenSum[0]?.total ?? 0,
    edit,
    challenges,
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

/**
 * Saves that a step was finished. Returns the new check-in's id (rewards links tokens to it),
 * or null if the step isn't in that routine or isn't the user's.
 */
export async function markStepDone(userId: ID, routineId: string, stepId: string, usedHelp: boolean): Promise<ID | null> {
  if (!isValidObjectId(routineId) || !isValidObjectId(stepId)) return null;
  await connectDB();
  const step = await StepModel.findOne({ user_id: userId, _id: stepId, routine_id: routineId }, { _id: 1 });
  if (!step) return null;
  const checkIn = await CheckInModel.create({ user_id: userId, step_id: stepId, routine_id: routineId, status: "done", used_help: usedHelp });
  return String(checkIn._id);
}
