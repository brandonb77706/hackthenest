import { Schema } from "mongoose";
import { USER_AVATAR_SOURCES, type UserAvatar } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ObjectId, schemaOptions, type Fields } from "../schema";

const fields = {
  avatar_id: { type: ObjectId, ref: "Avatar", required: true },
  source: { type: String, enum: USER_AVATAR_SOURCES, required: true },
  unlocked_at: { type: Date, default: Date.now },
} satisfies Fields<UserAvatar>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
// A user can own each avatar once.
schema.index({ user_id: 1, avatar_id: 1 }, { unique: true });

export const UserAvatarModel = defineModel("UserAvatar", schema);
