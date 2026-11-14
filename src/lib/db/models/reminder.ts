import { Schema } from "mongoose";
import { REMINDER_SOURCES, type Reminder } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, schemaOptions, type Fields } from "../schema";

const fields = {
  title: { type: String, required: true, trim: true },
  due: { type: Date, required: true },
  source: { type: String, enum: REMINDER_SOURCES, required: true },
  sent: { type: Boolean, default: false },
} satisfies Fields<Reminder>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
// The nudge job looks for unsent reminders that are due, across all users.
schema.index({ sent: 1, due: 1 });

export const ReminderModel = defineModel("Reminder", schema);
