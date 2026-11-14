import { Schema } from "mongoose";
import { WEEKDAYS, type Routine } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ownerField, schemaOptions, TIME_OF_DAY, type Fields } from "../schema";

const fields = {
  user_id: ownerField,
  title: { type: String, required: true, trim: true },
  // What the person told Bridge. Empty for routines made by hand.
  goal: { type: String, default: "", trim: true },
  days: { type: [{ type: String, enum: WEEKDAYS }], default: [] },
  start_time: { type: String, required: true, match: TIME_OF_DAY },
  active: { type: Boolean, default: true },
} satisfies Fields<Routine>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);

export const RoutineModel = defineModel("Routine", schema);
