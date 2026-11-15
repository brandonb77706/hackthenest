// Buying a Buddy with tokens. Server code only (docs/rewards.md: never trust the
// phone with tokens). One database transaction checks the balance, spends the
// tokens, adds the Buddy, and puts it on, so it all happens or none of it does.

import mongoose, { isValidObjectId } from "mongoose";
import { AvatarModel, connectDB, TokenTransactionModel, toRecord, UserAvatarModel, UserProfileModel } from "@/lib/db";
import type { Avatar, ID } from "@/lib/types";
import { checkPurchase, type PurchaseCheck } from "./shop";

export type BuyResult =
  | { ok: true; name: string; tokens: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; name: string; check: Exclude<PurchaseCheck, { ok: true }> };

/** Thrown inside the transaction to undo it and report why. */
class Refused extends Error {
  constructor(readonly result: Exclude<BuyResult, { ok: true }>) {
    super("purchase refused");
  }
}

export async function buyBuddy(userId: ID, avatarId: string): Promise<BuyResult> {
  if (!isValidObjectId(avatarId)) return { ok: false, reason: "not_found" };
  await connectDB();
  try {
    return await mongoose.connection.transaction(async (session) => {
      const doc = await AvatarModel.findById(avatarId).session(session);
      if (!doc) throw new Refused({ ok: false, reason: "not_found" });
      const avatar = toRecord<Avatar>(doc);

      // Write the profile first: two purchases at the same moment then clash, and
      // MongoDB runs the second again after the first, with the new balance.
      await UserProfileModel.updateOne(
        { user_id: userId },
        { $set: { equipped_avatar_id: avatarId }, $setOnInsert: { name: "Friend" } },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true, session },
      );

      const [owned, totals] = await Promise.all([
        UserAvatarModel.findOne({ user_id: userId, avatar_id: avatarId }).session(session),
        TokenTransactionModel.aggregate<{ total: number }>([
          { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]).session(session),
      ]);
      const check = checkPurchase({ avatar, owned: Boolean(owned), balance: totals[0]?.total ?? 0 });
      if (!check.ok) throw new Refused({ ok: false, name: avatar.name, check });

      await TokenTransactionModel.create([{ user_id: userId, amount: -check.price, reason: "purchase", ref_id: avatarId }], { session });
      await UserAvatarModel.create([{ user_id: userId, avatar_id: avatarId, source: "bought" }], { session });
      return { ok: true as const, name: avatar.name, tokens: check.left };
    });
  } catch (error) {
    if (error instanceof Refused) return error.result;
    throw error;
  }
}
