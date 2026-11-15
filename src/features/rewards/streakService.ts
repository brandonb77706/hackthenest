// Saves a streak day when a routine is finished. Server code only.
// Updates the profile's streak, pays a milestone bonus (streakBonus), and gives
// any streak Buddy the streak has reached.

import { AvatarModel, connectDB, TokenTransactionModel, toRecord, UserAvatarModel, UserProfileModel } from "@/lib/db";
import { localNow } from "@/lib/time";
import type { Avatar, ID, UserAvatar, UserProfile } from "@/lib/types";
import { streakBonus, type TokenAward } from "./earning";
import { advanceStreak, streakBuddiesToUnlock } from "./streak";

export interface StreakDayResult {
  /** The streak after today */
  streak: number;
  /** A milestone bonus, if today reached one */
  awards: TokenAward[];
  /** Names of streak Buddies unlocked today */
  unlocked: string[];
}

export async function recordStreakDay(userId: ID, timeZone: string, ref: ID | null, at = new Date()): Promise<StreakDayResult> {
  await connectDB();
  const today = localNow(at, timeZone).date;
  const doc = await UserProfileModel.findOne({ user_id: userId });
  const profile = doc ? toRecord<UserProfile>(doc) : null;
  const next = advanceStreak(
    {
      current_streak: profile?.current_streak ?? 0,
      longest_streak: profile?.longest_streak ?? 0,
      streak_freezes: profile?.streak_freezes ?? 0,
      last_streak_date: profile?.last_streak_date ?? null,
    },
    today,
  );
  if (!next.changed) return { streak: next.current_streak, awards: [], unlocked: [] };

  // Only the first finish of the day moves the streak: if two land at once,
  // the second no longer matches (its last day is already today) and pays nothing.
  const saved = await UserProfileModel.updateOne(
    { user_id: userId, last_streak_date: { $ne: today } },
    {
      $set: {
        current_streak: next.current_streak,
        longest_streak: next.longest_streak,
        streak_freezes: next.streak_freezes,
        last_streak_date: today,
      },
      $setOnInsert: { name: "Friend" },
    },
    { upsert: !profile, runValidators: true, setDefaultsOnInsert: true },
  );
  if (saved.modifiedCount === 0 && saved.upsertedCount === 0) return { streak: next.current_streak, awards: [], unlocked: [] };

  const bonus = streakBonus(next.current_streak);
  const awards = bonus ? [bonus] : [];
  if (bonus) await TokenTransactionModel.create({ user_id: userId, amount: bonus.amount, reason: bonus.reason, ref_id: ref });

  const [catalogDocs, ownedDocs] = await Promise.all([
    AvatarModel.find({ unlock_type: "streak" }),
    UserAvatarModel.find({ user_id: userId }, { avatar_id: 1 }),
  ]);
  const reached = streakBuddiesToUnlock(
    next.current_streak,
    catalogDocs.map((d) => toRecord<Avatar>(d)),
    ownedDocs.map((d) => toRecord<UserAvatar>(d).avatar_id),
  );
  for (const buddy of reached) {
    await UserAvatarModel.updateOne(
      { user_id: userId, avatar_id: buddy.id },
      { $setOnInsert: { user_id: userId, avatar_id: buddy.id, source: "streak" } },
      { upsert: true },
    );
  }
  return { streak: next.current_streak, awards, unlocked: reached.map((b) => b.name) };
}
