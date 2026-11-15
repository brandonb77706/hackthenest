// Welcome data and saving it. Server code only.

import { chooseBuddy } from "@/features/me/service";
import { buddyChoices, type BuddyChoice } from "@/features/me/summary";
import type { SignedInUser } from "@/lib/auth/session";
import { AvatarModel, connectDB, toRecord, UserProfileModel } from "@/lib/db";
import type { Avatar, ID, UserProfile } from "@/lib/types";
import { needsWelcome, suggestedName, type WelcomeInput } from "./welcome";

export interface WelcomeData {
  name: string;
  /** Every Buddy. Starters can be picked now; the rest show how to unlock them. */
  buddies: BuddyChoice[];
  done: boolean;
}

async function findProfile(userId: ID): Promise<UserProfile | null> {
  await connectDB();
  const doc = await UserProfileModel.findOne({ user_id: userId });
  return doc ? toRecord<UserProfile>(doc) : null;
}

/** True when this user still needs to go through Welcome. */
export async function userNeedsWelcome(userId: ID): Promise<boolean> {
  return needsWelcome(await findProfile(userId));
}

export async function getWelcome(user: SignedInUser): Promise<WelcomeData> {
  const [profile, catalogDocs] = await Promise.all([findProfile(user.id), AvatarModel.find({})]);
  const catalog = catalogDocs.map((doc) => toRecord<Avatar>(doc));
  return {
    name: suggestedName({ profileName: profile?.name, accountName: user.name, email: user.email }),
    buddies: buddyChoices(catalog, [], profile?.equipped_avatar_id ?? null),
    done: !needsWelcome(profile),
  };
}

export type FinishWelcomeResult = { ok: true; buddy_name: string } | { ok: false; error: string };

/** Saves the name and Buddy, and marks Welcome as done. */
export async function finishWelcome(userId: ID, input: WelcomeInput): Promise<FinishWelcomeResult> {
  const buddy = await chooseBuddy(userId, input.avatar_id);
  if (!buddy.ok) return { ok: false, error: "Please pick one of these Buddies." };
  await UserProfileModel.updateOne(
    { user_id: userId },
    { $set: { name: input.name, onboarded: true } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return { ok: true, buddy_name: buddy.name };
}
