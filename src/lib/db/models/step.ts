import { Schema } from "mongoose";
import type { Step } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ObjectId, ownerField, schemaOptions, type Fields } from "../schema";

const fields = {
  user_id: ownerField,
  routine_id: { type: ObjectId, ref: "Routine", required: true },
  order: { type: Number, required: true, min: 1 },
  text: { type: String, required: true, trim: true },
  minutes: { type: Number, required: true, min: 1 },
  image_url: { type: String, default: null },
  audio_url: { type: String, default: null },
} satisfies Fields<Step>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
schema.index({ user_id: 1, routine_id: 1, order: 1 });

export const StepModel = defineModel("Step", schema);
