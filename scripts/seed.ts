// Seeds the database: the test user's profile and the avatar catalog.
// Safe to run more than once: it updates existing records instead of duplicating them.
//
//   npm run db:seed

import { hashPassword } from "better-auth/crypto";
import mongoose from "mongoose";
import {
  AvatarModel,
  CheckInModel,
  connectDB,
  GuardianLinkModel,
  DEMO_USER_ID,
  HelpRequestModel,
  ReminderModel,
  RoutineModel,
  SetupCodeModel,
  SpeakPhraseModel,
  StepModel,
  TokenTransactionModel,
  TrustedContactModel,
  UserAvatarModel,
  UserProfileModel,
} from "@/lib/db";
import type { Avatar } from "@/lib/types";

// From docs/rewards.md. Every Buddy has a drawing in BuddyAvatar (from the design).
const AVATARS: Omit<Avatar, "id">[] = [
  { name: "Fox", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/fox.png" },
  { name: "Penguin", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/penguin.png" },
  { name: "Beaver", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/beaver.png" },
  { name: "Frog", unlock_type: "shop", price: 120, streak_required: null, image_url: "/avatars/frog.png" },
  { name: "Owl", unlock_type: "shop", price: 200, streak_required: null, image_url: "/avatars/owl.png" },
  { name: "Cat", unlock_type: "shop", price: 300, streak_required: null, image_url: "/avatars/cat.png" },
  { name: "Turtle", unlock_type: "streak", price: null, streak_required: 7, image_url: "/avatars/turtle.png" },
  { name: "Bunny", unlock_type: "streak", price: null, streak_required: 14, image_url: "/avatars/bunny.png" },
];

const ALL_MODELS = [
  AvatarModel,
  CheckInModel,
  GuardianLinkModel,
  HelpRequestModel,
  ReminderModel,
  RoutineModel,
  SetupCodeModel,
  SpeakPhraseModel,
  StepModel,
  TokenTransactionModel,
  TrustedContactModel,
  UserAvatarModel,
  UserProfileModel,
];

const upsert = { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true } as const;

async function main() {
  await connectDB();
  console.log(`Connected to database "${mongoose.connection.name}"`);

  // Builds the unique and lookup indexes defined in the models.
  await Promise.all(ALL_MODELS.map((model) => model.createIndexes()));
  console.log(`Indexes ready on ${ALL_MODELS.length} collections`);

  for (const avatar of AVATARS) {
    await AvatarModel.findOneAndUpdate({ name: avatar.name }, avatar, upsert);
  }
  // Remove Buddies no longer in the catalog (they had no drawing), and anyone's copy of them.
  const removed = await AvatarModel.find({ name: { $nin: AVATARS.map((a) => a.name) } });
  if (removed.length > 0) {
    const ids = removed.map((a) => a._id);
    await UserAvatarModel.deleteMany({ avatar_id: { $in: ids } }).setOptions({ allUsers: true });
    await UserProfileModel.updateMany({ equipped_avatar_id: { $in: ids } }, { $set: { equipped_avatar_id: null } }).setOptions({ allUsers: true });
    await AvatarModel.deleteMany({ _id: { $in: ids } });
    console.log(`Removed old Buddies: ${removed.map((a) => a.name).join(", ")}`);
  }
  console.log(`Avatar catalog: ${AVATARS.length} avatars`);

  const fox = await AvatarModel.findOne({ name: "Fox" }).orFail();
  const user_id = DEMO_USER_ID;

  await UserAvatarModel.findOneAndUpdate({ user_id, avatar_id: fox._id }, { source: "starter" }, upsert);
  await UserProfileModel.findOneAndUpdate(
    { user_id },
    { $set: { equipped_avatar_id: fox._id, onboarded: true }, $setOnInsert: { name: "Jordan" } },
    upsert,
  );
  console.log(`Test user ${user_id}: profile ready, Fox equipped`);

  await seedLogins();
}

// Demo logins, stored the way Better Auth stores them (src/lib/auth/server.ts).
// Jordan's account id is DEMO_USER_ID, so signing in as Jordan shows the sample data.
// The password is for the demo only. Set DEMO_PASSWORD in .env.local to change it.
const DEMO_LOGINS = [
  { id: DEMO_USER_ID, name: "Jordan", email: "jordan@example.com", role: "user" },
  { id: "64b000000000000000000002", name: "Sam", email: "sam@example.com", role: "guardian" },
] as const;

async function seedLogins() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Not connected");
  const password = await hashPassword(process.env.DEMO_PASSWORD || "bridge-demo-2026");
  const now = new Date();

  for (const login of DEMO_LOGINS) {
    const _id = new mongoose.Types.ObjectId(login.id);
    const taken = await db.collection("user").findOne({ email: login.email, _id: { $ne: _id } });
    if (taken) {
      console.log(`Skipped ${login.email}: another account already uses that email`);
      continue;
    }
    await db.collection("user").updateOne(
      { _id },
      {
        $set: { email: login.email, role: login.role, emailVerified: true, updatedAt: now },
        $setOnInsert: { name: login.name, image: null, createdAt: now },
      },
      { upsert: true },
    );
    await db.collection("account").updateOne(
      { userId: _id, providerId: "credential" },
      {
        $set: { password, updatedAt: now },
        $setOnInsert: { accountId: login.id, createdAt: now },
      },
      { upsert: true },
    );
    console.log(`Login ready: ${login.email} (${login.role})`);
  }

  // Sam is Jordan's guardian in the demo. Jordan chose to share routines with Sam
  // (real links start with everything off; the user turns sharing on).
  const [jordan, sam] = DEMO_LOGINS.map((l) => new mongoose.Types.ObjectId(l.id));
  await GuardianLinkModel.updateOne(
    { user_id: jordan, guardian_id: sam },
    { $set: { can_see_routines: true }, $setOnInsert: { created_at: now } },
    { upsert: true },
  );
  console.log("Sam is linked to Jordan as their guardian (sees routines)");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
