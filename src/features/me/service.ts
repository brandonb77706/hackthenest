// Reads what the Me screen shows. Server code only. Read-only: nothing here changes data.

import mongoose from "mongoose";
import {
  AvatarModel,
  connectDB,
  TokenTransactionModel,
  toRecord,
  UserAvatarModel,
  UserProfileModel,
} from "@/lib/db";
import type { Avatar, ID, UserAvatar, UserProfile } from "@/lib/types";
import { nextReward, type MeSummary } from "./summary";

export async function getMeSummary(userId: ID): Promise<MeSummary> {
  await connectDB();
  const [profileDoc, totals, ownedDocs, shopDocs] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }),
    // The balance is the sum of the user's transactions (docs/rewards.md).
    TokenTransactionModel.aggregate<{ total: number }>([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserAvatarModel.find({ user_id: userId }),
    AvatarModel.find({ unlock_type: "shop" }),
  ]);

  const profile = profileDoc ? toRecord<UserProfile>(profileDoc) : null;
  const buddyDoc = profile?.equipped_avatar_id ? await AvatarModel.findById(profile.equipped_avatar_id) : null;
  const tokens = totals[0]?.total ?? 0;

  return {
    name: profile?.name ?? "",
    tokens,
    buddyName: buddyDoc ? toRecord<Avatar>(buddyDoc).name : null,
    nextReward: nextReward(
      tokens,
      shopDocs.map((doc) => toRecord<Avatar>(doc)),
      ownedDocs.map((doc) => toRecord<UserAvatar>(doc).avatar_id),
    ),
  };
}
