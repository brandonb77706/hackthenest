// Daily challenges, server side: works out today's progress from saved data and
// pays each challenge once a day. Called after a routine is finished, a scan,
// and a new routine. Server code only; the phone never says a challenge is done.

import mongoose from "mongoose";
import { getEditRules } from "@/features/guardians/service";
import { summarizeDay } from "@/features/home/today";
import {
  CheckInModel,
  connectDB,
  DailyChallengeModel,
  HelpRequestModel,
  RoutineModel,
  StepModel,
  TokenTransactionModel,
  toRecord,
} from "@/lib/db";
import { localNow } from "@/lib/time";
import type { CheckIn, DailyChallenge, ID, Routine, Step } from "@/lib/types";
import { challengeStatus, readyToClaim, type ChallengeFacts, type ChallengeStatus } from "./challenges";

/** Ids made in the last day and a half: enough to cover "today" in any time zone. */
const recentIds = (at: Date) => ({ $gte: mongoose.Types.ObjectId.createFromTime(Math.floor((at.getTime() - 36 * 3600_000) / 1000)) });
const madeOnDay = (id: unknown, timeZone: string) => localNow(new mongoose.Types.ObjectId(String(id)).getTimestamp(), timeZone).date;

export async function challengeFacts(userId: ID, timeZone: string, at = new Date()): Promise<ChallengeFacts & { date: string }> {
  await connectDB();
  const now = localNow(at, timeZone);
  const [routineDocs, stepDocs, recentDone, scanDocs, madeDocs, claimedDocs, rules] = await Promise.all([
    RoutineModel.find({ user_id: userId, active: true }),
    StepModel.find({ user_id: userId }, { routine_id: 1 }),
    CheckInModel.find({ user_id: userId, status: "done", time: { $gte: new Date(at.getTime() - 36 * 3600_000) } }),
    HelpRequestModel.find({ user_id: userId, type: "camera", _id: recentIds(at) }, { _id: 1 }),
    RoutineModel.find({ user_id: userId, added_by: null, _id: recentIds(at) }, { _id: 1 }),
    DailyChallengeModel.find({ user_id: userId, date: now.date }),
    getEditRules(userId),
  ]);

  const stepIds = new Map<string, string[]>();
  for (const doc of stepDocs) {
    const step = toRecord<Step>(doc);
    stepIds.set(step.routine_id, [...(stepIds.get(step.routine_id) ?? []), step.id]);
  }
  const doneStepIds = new Set(
    recentDone
      .map((doc) => toRecord<CheckIn>(doc))
      .filter((c) => localNow(new Date(c.time), timeZone).date === now.date)
      .map((c) => c.step_id),
  );
  const today = summarizeDay({
    routines: routineDocs.map((doc) => {
      const r = toRecord<Routine>(doc);
      return { ...r, step_ids: stepIds.get(r.id) ?? [] };
    }),
    doneStepIds,
    weekday: now.weekday,
  }).filter((r) => r.status !== "not_today" && r.step_count > 0);

  return {
    date: now.date,
    routinesToday: today.length,
    routinesDoneToday: today.filter((r) => r.status === "done").length,
    scansToday: scanDocs.filter((d) => madeOnDay(d._id, timeZone) === now.date).length,
    routinesMadeToday: madeDocs.filter((d) => madeOnDay(d._id, timeZone) === now.date).length,
    canMakeRoutines: rules.routines.allowed,
    claimed: claimedDocs.map((d) => toRecord<DailyChallenge>(d).challenge),
  };
}

/** Today's challenges with progress, for the Today screen. */
export async function getChallenges(userId: ID, timeZone: string, at = new Date()): Promise<ChallengeStatus[]> {
  return challengeStatus(await challengeFacts(userId, timeZone, at));
}

/** Pays any challenge met today and not paid yet. Returns what was paid now. */
export async function claimChallenges(userId: ID, timeZone: string, at = new Date()): Promise<ChallengeStatus[]> {
  const facts = await challengeFacts(userId, timeZone, at);
  const paid: ChallengeStatus[] = [];
  for (const c of readyToClaim(facts)) {
    try {
      // The unique index (user, day, challenge) refuses a second save, so two
      // taps at once can't both pay.
      await DailyChallengeModel.create({ user_id: userId, challenge: c.id, date: facts.date, tokens: c.tokens });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) continue;
      throw error;
    }
    await TokenTransactionModel.create({ user_id: userId, amount: c.tokens, reason: "challenge", ref_id: null });
    paid.push(c);
  }
  return paid;
}

/** Saves that a scan happened, for the scan challenge. Nothing from the photo is kept. */
export async function recordScan(userId: ID): Promise<void> {
  await connectDB();
  await HelpRequestModel.create({ user_id: userId, type: "camera" });
}
