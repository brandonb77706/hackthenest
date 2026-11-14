import { Schema } from "mongoose";
import { CHECK_IN_STATUSES, type CheckIn } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ObjectId, ownerField, schemaOptions, type Fields } from "../schema";

const fields = {
  user_id: ownerField,
  step_id: { type: ObjectId, ref: "Step", required: true },
  routine_id: { type: ObjectId, ref: "Routine", required: true },
  status: { type: String, enum: CHECK_IN_STATUSES, required: true },
  used_help: { type: Boolean, default: false },
  time: { type: Date, default: Date.now },
} satisfies Fields<CheckIn>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
// Streaks and the independence score read recent check-ins.
schema.index({ user_id: 1, time: -1 });

export const CheckInModel = defineModel("CheckIn", schema);
