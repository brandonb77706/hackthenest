import { Schema } from "mongoose";
import { CONTACT_METHODS, DEFAULT_CONTACT_PERMISSIONS, type TrustedContact } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ownerField, schemaOptions, type Fields } from "../schema";

const fields = {
  user_id: ownerField,
  name: { type: String, required: true, trim: true },
  method: { type: String, enum: CONTACT_METHODS, required: true },
  contact: { type: String, required: true, trim: true },
  relation: { type: String, default: "", trim: true },
  // Sharing is always off until the user turns it on.
  can_see_routines: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_see_routines },
  can_get_lost_alerts: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_get_lost_alerts },
  can_get_stuck_alerts: { type: Boolean, default: DEFAULT_CONTACT_PERMISSIONS.can_get_stuck_alerts },
} satisfies Fields<TrustedContact>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);

export const TrustedContactModel = defineModel("TrustedContact", schema);
