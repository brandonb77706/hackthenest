import { Schema } from "mongoose";
import type { SpeakPhrase } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, schemaOptions, type Fields } from "../schema";

const fields = {
  text: { type: String, required: true, trim: true },
  audio_url: { type: String, default: null },
  order: { type: Number, default: 0 },
} satisfies Fields<SpeakPhrase>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);

export const SpeakPhraseModel = defineModel("SpeakPhrase", schema);
