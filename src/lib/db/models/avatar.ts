import { Schema } from "mongoose";
import { AVATAR_UNLOCK_TYPES, type Avatar } from "@/lib/types";
import { defineModel, schemaOptions, type Fields } from "../schema";

type UnlockDoc = { unlock_type?: string };

const fields = {
  name: { type: String, required: true, trim: true },
  image_url: { type: String, required: true },
  unlock_type: { type: String, enum: AVATAR_UNLOCK_TYPES, required: true },
  price: {
    type: Number,
    min: 1,
    default: null,
    required: function (this: UnlockDoc) {
      return this.unlock_type === "shop";
    },
  },
  streak_required: {
    type: Number,
    min: 1,
    default: null,
    required: function (this: UnlockDoc) {
      return this.unlock_type === "streak";
    },
  },
} satisfies Fields<Avatar>;

// Shared catalog, not owned by a user, so there's no user_id. Only seed
// scripts write it. Users only read it.
const schema = new Schema(fields, schemaOptions);
// The seed script finds avatars by name, so names must be unique.
schema.index({ name: 1 }, { unique: true });

export const AvatarModel = defineModel("Avatar", schema);
