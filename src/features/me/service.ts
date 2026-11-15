// What the Me tab shows, and saving the Buddy and look settings. Server code only.
// Based on Adrian's getMeSummary.

import mongoose, { isValidObjectId } from "mongoose";
import { listContacts } from "@/features/help/service";
import {
  AvatarModel,
  connectDB,
  TokenTransactionModel,
  toRecord,
  UserAvatarModel,
  UserProfileModel,
} from "@/lib/db";
import { DEFAULT_COLOR_SCHEME, isColorScheme, type ColorSchemeId } from "@/lib/theme";
import type { Avatar, ID, TrustedContact, UserAvatar, UserProfile } from "@/lib/types";
import { buddyChoices, nextReward, type BuddyChoice, type MeSummary } from "./summary";

export interface MeSettings {
  color_scheme: ColorSchemeId;
  show_buddy: boolean;
  /** Name of the equipped Buddy, or null if none */
  buddy_name: string | null;
}

export interface MeData {
  summary: MeSummary;
  buddies: BuddyChoice[];
  contacts: TrustedContact[];
  settings: MeSettings;
}

export function settingsOf(profile: UserProfile | null, buddyName: string | null): MeSettings {
  return {
    color_scheme: isColorScheme(profile?.color_scheme) ? profile.color_scheme : DEFAULT_COLOR_SCHEME,
    show_buddy: profile?.show_buddy !== false,
    buddy_name: buddyName,
  };
}

export async function getMe(userId: ID): Promise<MeData> {
  await connectDB();
  const [profileDoc, totals, ownedDocs, catalogDocs, contacts] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }),
    // The balance is the sum of the user's transactions (docs/rewards.md).
    TokenTransactionModel.aggregate<{ total: number }>([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserAvatarModel.find({ user_id: userId }),
    AvatarModel.find({}),
    listContacts(userId),
  ]);

  const profile = profileDoc ? toRecord<UserProfile>(profileDoc) : null;
  const catalog = catalogDocs.map((doc) => toRecord<Avatar>(doc));
  const ownedIds = ownedDocs.map((doc) => toRecord<UserAvatar>(doc).avatar_id);
  const buddy = catalog.find((a) => a.id === profile?.equipped_avatar_id) ?? null;
  const tokens = totals[0]?.total ?? 0;

  return {
    summary: {
      name: profile?.name ?? "",
      tokens,
      buddyName: buddy?.name ?? null,
      nextReward: nextReward(
        tokens,
        catalog.filter((a) => a.unlock_type === "shop"),
        ownedIds,
      ),
    },
    buddies: buddyChoices(catalog, ownedIds, profile?.equipped_avatar_id ?? null),
    contacts,
    settings: settingsOf(profile, buddy?.name ?? null),
  };
}

export type ChooseBuddyResult = { ok: true; name: string } | { ok: false; reason: "not_found" | "locked" };

/** Equips a Buddy the user owns, or any starter Buddy (which they then own). */
export async function chooseBuddy(userId: ID, avatarId: string): Promise<ChooseBuddyResult> {
  if (!isValidObjectId(avatarId)) return { ok: false, reason: "not_found" };
  await connectDB();
  const avatarDoc = await AvatarModel.findById(avatarId);
  if (!avatarDoc) return { ok: false, reason: "not_found" };
  const avatar = toRecord<Avatar>(avatarDoc);
  const owned = await UserAvatarModel.findOne({ user_id: userId, avatar_id: avatarId });
  if (!owned && avatar.unlock_type !== "starter") return { ok: false, reason: "locked" };
  if (!owned) await UserAvatarModel.create({ user_id: userId, avatar_id: avatarId, source: "starter" });
  await UserProfileModel.updateOne(
    { user_id: userId },
    { $set: { equipped_avatar_id: avatarId }, $setOnInsert: { name: "Friend" } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return { ok: true, name: avatar.name };
}

export async function updateMeSettings(
  userId: ID,
  patch: { color_scheme?: ColorSchemeId; show_buddy?: boolean },
): Promise<void> {
  await connectDB();
  await UserProfileModel.updateOne(
    { user_id: userId },
    { $set: patch, $setOnInsert: { name: "Friend" } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}
