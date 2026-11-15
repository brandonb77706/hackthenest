import { Schema } from "mongoose";
import { CHALLENGE_IDS, type DailyChallenge } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { DATE_ONLY, defineModel, ownerField, schemaOptions, type Fields } from "../schema";

const fields = {
  user_id: ownerField,
  challenge: { type: String, enum: CHALLENGE_IDS, required: true },
  date: { type: String, match: DATE_ONLY, required: true },
  tokens: { type: Number, min: 0, required: true },
  completed_at: { type: Date, default: Date.now },
} satisfies Fields<DailyChallenge>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
// Each challenge pays once a day: a second save for the same day is refused.
schema.index({ user_id: 1, date: 1, challenge: 1 }, { unique: true });

export const DailyChallengeModel = defineModel("DailyChallenge", schema);
