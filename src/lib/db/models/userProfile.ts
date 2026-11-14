import { Schema } from "mongoose";
import { SUPPORT_LEVELS, type UserProfile } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { DATE_ONLY, defineModel, ObjectId, schemaOptions, type Fields } from "../schema";

const fields = {
  // One profile per user.
  user_id: { type: ObjectId, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  voice_id: { type: String, default: "" },
  speech_speed: { type: Number, min: 0.7, max: 1.2, default: 0.9 },
  support_level: { type: String, enum: SUPPORT_LEVELS, default: "high" },
  demo_mode: { type: Boolean, default: false },
  current_streak: { type: Number, min: 0, default: 0 },
  longest_streak: { type: Number, min: 0, default: 0 },
  streak_freezes: { type: Number, min: 0, max: 2, default: 0 },
  last_streak_date: { type: String, match: DATE_ONLY, default: null },
  equipped_avatar_id: { type: ObjectId, ref: "Avatar", default: null },
} satisfies Fields<UserProfile>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);

export const UserProfileModel = defineModel("UserProfile", schema);
