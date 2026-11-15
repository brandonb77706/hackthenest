// What the Me tab shows, and saving the Buddy and look settings. Server code only.
// Based on Adrian's getMeSummary.

import mongoose, { isValidObjectId } from "mongoose";
import { getEditRules } from "@/features/guardians/service";
import type { EditRules } from "@/features/guardians/editRules";
import { listContacts } from "@/features/help/service";
import {
  AvatarModel,
  CheckInModel,
  connectDB,
  RoutineModel,
  StepModel,
  TokenTransactionModel,
  toRecord,
  UserAvatarModel,
  UserProfileModel,
} from "@/lib/db";
import { DEFAULT_COLOR_SCHEME, isColorScheme, type ColorSchemeId } from "@/lib/theme";
import type { Avatar, CheckIn, ID, Routine, Step, TrustedContact, UserAvatar, UserProfile } from "@/lib/types";
import { earnBadges, type BadgeFacts, type BadgeStatus } from "./badges";
import { liveStreak } from "@/features/rewards/streak";
import { streakProgress } from "@/features/rewards/streakProgress";
import { localNow } from "@/lib/time";
import { buddyChoices, nextReward, type BuddyChoice, type MeSummary, type NextReward } from "./summary";

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
  /** Whether the user can add and change contacts (a guardian can turn it off). Missing means allowed */
  edit?: EditRules;
  /** Every badge, earned or not */
  badges?: BadgeStatus[];
  /** The streak and the next streak reward, shown like the next reward */
  streak?: NextReward;
}

/** "YYYY-MM-DD" a record was made, from its MongoDB id. */
const madeOn = (id: string) => new mongoose.Types.ObjectId(id).getTimestamp().toISOString().slice(0, 10);

/** What badges are worked out from. Dates are UTC days. */
async function badgeFacts(userId: ID, profile: UserProfile | null, tokens: number, owned: UserAvatar[]): Promise<BadgeFacts> {
  const [routineDocs, stepDocs, doneDocs] = await Promise.all([
    RoutineModel.find({ user_id: userId }),
    StepModel.find({ user_id: userId }, { routine_id: 1 }),
    CheckInModel.find({ user_id: userId, status: "done" }, { routine_id: 1, step_id: 1, time: 1 }),
  ]);
  const stepIds = new Map<string, string[]>();
  for (const doc of stepDocs) {
    const step = toRecord<Step>(doc);
    stepIds.set(step.routine_id, [...(stepIds.get(step.routine_id) ?? []), step.id]);
  }
  return {
    routines: routineDocs.map((doc) => {
      const r = toRecord<Routine>(doc);
      return {
        id: r.id,
        title: r.title,
        start_time: r.start_time,
        days: r.days,
        active: r.active,
        step_ids: stepIds.get(r.id) ?? [],
        added_by: r.added_by ?? null,
        created_on: madeOn(r.id),
      };
    }),
    done: doneDocs.map((doc) => {
      const c = toRecord<CheckIn>(doc);
      return { routine_id: c.routine_id, step_id: c.step_id, date: new Date(c.time).toISOString().slice(0, 10) };
    }),
    pickedColors: isColorScheme(profile?.color_scheme) && profile.color_scheme !== DEFAULT_COLOR_SCHEME,
    tokens,
    buddiesOn: owned.map((o) => madeOn(o.id)).sort(),
  };
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
  const [profileDoc, totals, ownedDocs, catalogDocs, contacts, edit] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }),
    // The balance is the sum of the user's transactions (docs/rewards.md).
    TokenTransactionModel.aggregate<{ total: number }>([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    UserAvatarModel.find({ user_id: userId }),
    AvatarModel.find({}),
    listContacts(userId),
    getEditRules(userId),
  ]);

  const profile = profileDoc ? toRecord<UserProfile>(profileDoc) : null;
  const catalog = catalogDocs.map((doc) => toRecord<Avatar>(doc));
  const owned = ownedDocs.map((doc) => toRecord<UserAvatar>(doc));
  const ownedIds = owned.map((o) => o.avatar_id);
  const buddy = catalog.find((a) => a.id === profile?.equipped_avatar_id) ?? null;
  const tokens = totals[0]?.total ?? 0;
  // Server time zone is UTC here; a day off at most for the "still going" check.
  const streakDays = profile ? liveStreak(profile, localNow(new Date(), "UTC").date) : 0;
  const streak = streakProgress(streakDays, {
    freezes: profile?.streak_freezes ?? 0,
    streakBuddies: catalog.filter((a) => a.unlock_type === "streak"),
  });
  const badges = earnBadges(await badgeFacts(userId, profile, tokens, owned));

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
    edit,
    badges,
    streak,
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
