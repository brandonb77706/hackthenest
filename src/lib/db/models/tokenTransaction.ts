import { Schema, type Document } from "mongoose";
import { TOKEN_REASONS, type TokenTransaction } from "@/lib/types";
import { ownedPlugin } from "../owned";
import { defineModel, ObjectId, schemaOptions, type Fields } from "../schema";

const fields = {
  amount: {
    type: Number,
    required: true,
    validate: { validator: Number.isInteger, message: "amount must be a whole number" },
  },
  reason: { type: String, enum: TOKEN_REASONS, required: true },
  ref_id: { type: ObjectId, default: null },
  time: { type: Date, default: Date.now },
} satisfies Fields<TokenTransaction>;

const schema = new Schema(fields, schemaOptions);
schema.plugin(ownedPlugin);
schema.index({ user_id: 1, time: -1 });

// Rewards never punish: only a purchase can spend tokens, and nothing else can remove them.
schema.pre<Document & { amount?: unknown; reason?: unknown }>("validate", function () {
  if (typeof this.amount !== "number") return;
  if (this.reason === "purchase" && this.amount >= 0) {
    this.invalidate("amount", "A purchase must have a negative amount");
  } else if (this.reason !== "purchase" && this.amount <= 0) {
    this.invalidate("amount", "Earned tokens must have a positive amount. Tokens are never taken away.");
  }
});

export const TokenTransactionModel = defineModel("TokenTransaction", schema);
