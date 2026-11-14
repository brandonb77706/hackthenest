import { Schema } from "mongoose";
import { HELP_REQUEST_TYPES, type HelpRequest } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, schemaOptions, type Fields } from "../schema";

const fields = {
  type: { type: String, enum: HELP_REQUEST_TYPES, required: true },
  input_text: { type: String, default: "" },
  image_url: { type: String, default: null },
  ai_response: { type: String, default: "" },
  escalated: { type: Boolean, default: false },
} satisfies Fields<HelpRequest>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);

export const HelpRequestModel = defineModel("HelpRequest", schema);
