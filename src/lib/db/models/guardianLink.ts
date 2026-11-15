import { Schema } from "mongoose";
import { DEFAULT_CONTACT_PERMISSIONS, type GuardianLink } from "@/lib/types";
import { defineModel, ObjectId, schemaOptions, type Fields } from "../schema";

// Not guarded by ownedPlugin: a link belongs to two accounts, so it's looked up
// by user_id or by guardian_id. src/features/guardians/service.ts always filters
// by the signed-in account.
const fields = {
  user_id: { type: ObjectId, required: true, index: true },
  guardian_id: { type: ObjectId, required: true, index: true },
  // Sharing is always off until the user turns it on.
  can_see_routines: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_see_routines },
  can_get_lost_alerts: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_get_lost_alerts },
  can_get_stuck_alerts: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_get_stuck_alerts },
  // What the user can change themselves. Only the guardian sets these; on by default.
  user_can_edit_routines: { type: Boolean, default: true },
  user_can_edit_contacts: { type: Boolean, default: true },
  created_at: { type: Date, default: () => new Date() },
} satisfies Fields<GuardianLink>;

const schema = new Schema(fields, schemaOptions);
schema.index({ user_id: 1, guardian_id: 1 }, { unique: true });

export const GuardianLinkModel = defineModel("GuardianLink", schema);
