// Users can only read and write their own records. This plugin adds user_id
// to a model and rejects any query that doesn't filter by it.
//
// Server jobs that really need every user's records (like Nati's check-in
// nudges) opt out on purpose:
//   ReminderModel.find({ sent: false }).setOptions({ allUsers: true })

import type { MongooseQueryOrDocumentMiddleware, Query, Schema } from "mongoose";
import { ObjectId } from "./schema";

const GUARDED_QUERIES: MongooseQueryOrDocumentMiddleware[] = [
  "find",
  "findOne",
  "countDocuments",
  "estimatedDocumentCount",
  "distinct",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "replaceOne",
];

export interface OwnerOptions {
  allUsers?: boolean;
}

export class MissingUserIdError extends Error {
  constructor(where: string) {
    super(
      `${where} must filter by user_id so users only see their own records. ` +
        `If this server job really needs every user, add .setOptions({ allUsers: true }).`,
    );
    this.name = "MissingUserIdError";
  }
}

export function checkOwnerFilter(filter: Record<string, unknown>, options: OwnerOptions, where = "Query"): void {
  if (options.allUsers === true) return;
  if (filter.user_id === undefined || filter.user_id === null) throw new MissingUserIdError(where);
}

export function ownedPlugin(schema: Schema, opts: { unique?: boolean } = {}): void {
  schema.add({
    user_id: { type: ObjectId, required: true, ...(opts.unique ? { unique: true } : { index: true }) },
  });

  schema.pre<Query<unknown, unknown>>(GUARDED_QUERIES, { document: false, query: true }, function () {
    checkOwnerFilter(this.getFilter(), this.getOptions() as OwnerOptions, `${this.model.modelName} query`);
  });

  schema.pre("aggregate", function () {
    const first = this.pipeline()[0] as { $match?: Record<string, unknown> } | undefined;
    checkOwnerFilter(first?.$match ?? {}, this.options as OwnerOptions, "Aggregate (first stage must be $match)");
  });
}
