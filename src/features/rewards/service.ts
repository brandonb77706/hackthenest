// Saves earned tokens in MongoDB. Server code only.
// Loads the facts, lets awardsForCheckIn() decide, then writes one TokenTransaction per award.

import { CheckInModel, connectDB, StepModel, TokenTransactionModel } from "@/lib/db";
import { localNow } from "@/lib/time";
import type { ID } from "@/lib/types";
import type { TokenAward } from "./earning";
import { awardsForCheckIn } from "./stepAwards";

export interface StepDoneEvent {
  /** The check-in markStepDone() just saved */
  checkInId: ID;
  routineId: ID;
  stepId: ID;
  usedHelp: boolean;
  /** The user's time zone, so "today" means their day. Unknown zones fall back to UTC. */
  timeZone: string;
}

/** Gives the tokens for one Done tap and returns what was given (empty if nothing). */
export async function awardStepDone(userId: ID, event: StepDoneEvent, at = new Date()): Promise<TokenAward[]> {
  await connectDB();
  const [stepDocs, earlierDocs, firstRoutineCount] = await Promise.all([
    StepModel.find({ user_id: userId, routine_id: event.routineId }, { _id: 1 }),
    // Check-ins saved before this one. A day and a half covers "today" in any time zone;
    // filtered to the local date below. "$lt" (not "everything except this one") means that
    // when two taps land at once, the first still gets paid and only the second is a repeat.
    CheckInModel.find(
      {
        user_id: userId,
        routine_id: event.routineId,
        status: "done",
        _id: { $lt: event.checkInId },
        time: { $gte: new Date(at.getTime() - 36 * 3600_000) },
      },
      { step_id: 1, time: 1 },
    ),
    TokenTransactionModel.countDocuments({ user_id: userId, reason: "first_routine" }),
  ]);

  const today = localNow(at, event.timeZone).date;
  const doneTodayBefore = earlierDocs
    .filter((doc) => localNow(new Date(doc.get("time")), event.timeZone).date === today)
    .map((doc) => String(doc.get("step_id")));

  const awards = awardsForCheckIn({
    stepId: event.stepId,
    routineStepIds: stepDocs.map((doc) => String(doc._id)),
    doneTodayBefore,
    hasFirstRoutineAward: firstRoutineCount > 0,
    usedHelp: event.usedHelp,
  });

  if (awards.length > 0) {
    await TokenTransactionModel.insertMany(
      awards.map((award) => ({ user_id: userId, amount: award.amount, reason: award.reason, ref_id: event.checkInId })),
    );
  }
  return awards;
}
