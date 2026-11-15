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
  DEMO_USER_ID,
  HelpRequestModel,
  ReminderModel,
  RoutineModel,
  SpeakPhraseModel,
  StepModel,
  TokenTransactionModel,
  TrustedContactModel,
  UserAvatarModel,
  UserProfileModel,
} from "@/lib/db";
import type { Avatar } from "@/lib/types";

// From docs/rewards.md. Images are placeholders until the catalog is generated.
const AVATARS: Omit<Avatar, "id">[] = [
  { name: "Fox", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/fox.png" },
  { name: "Robot", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/robot.png" },
  { name: "Cloud", unlock_type: "starter", price: null, streak_required: null, image_url: "/avatars/cloud.png" },
  { name: "Astronaut cat", unlock_type: "shop", price: 100, streak_required: null, image_url: "/avatars/astronaut-cat.png" },
  { name: "Chef bear", unlock_type: "shop", price: 150, streak_required: null, image_url: "/avatars/chef-bear.png" },
  { name: "Skater owl", unlock_type: "shop", price: 300, streak_required: null, image_url: "/avatars/skater-owl.png" },
  { name: "Bronze star buddy", unlock_type: "streak", price: null, streak_required: 7, image_url: "/avatars/bronze-star-buddy.png" },
  { name: "Silver dragon", unlock_type: "streak", price: null, streak_required: 14, image_url: "/avatars/silver-dragon.png" },
  { name: "Gold phoenix", unlock_type: "streak", price: null, streak_required: 30, image_url: "/avatars/gold-phoenix.png" },
];

const ALL_MODELS = [
  AvatarModel,
  CheckInModel,
  HelpRequestModel,
  ReminderModel,
  RoutineModel,
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
  console.log(`Avatar catalog: ${AVATARS.length} avatars`);

  const fox = await AvatarModel.findOne({ name: "Fox" }).orFail();
  const user_id = DEMO_USER_ID;

  await UserAvatarModel.findOneAndUpdate({ user_id, avatar_id: fox._id }, { source: "starter" }, upsert);
  await UserProfileModel.findOneAndUpdate(
    { user_id },
    { $set: { equipped_avatar_id: fox._id }, $setOnInsert: { name: "Jordan" } },
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
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
