// Seeds the database: the test user's profile and the avatar catalog.
// Safe to run more than once: it updates existing records instead of duplicating them.
//
//   npm run db:seed

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
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
