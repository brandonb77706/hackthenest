import { Schema } from "mongoose";
import { SETUP_CODE_FROM, type SetupCode } from "@/lib/types";
import { defineModel, ObjectId, schemaOptions, type Fields } from "../schema";

// Not guarded by ownedPlugin: the person entering a code doesn't own it yet.
// Looked up only by the code itself, in src/features/guardians/service.ts.
const fields = {
  code: { type: String, required: true, unique: true },
  from_role: { type: String, enum: SETUP_CODE_FROM, required: true },
  created_by: { type: ObjectId, required: true, index: true },
  name: { type: String, default: null, trim: true },
  // MongoDB deletes the code a day after it expires.
  expires_at: { type: Date, required: true, index: { expires: 60 * 60 * 24 } },
  used_at: { type: Date, default: null },
  used_by: { type: ObjectId, default: null },
} satisfies Fields<SetupCode>;

const schema = new Schema(fields, schemaOptions);

export const SetupCodeModel = defineModel("SetupCode", schema);
